from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import anthropic
import sqlite3
import os
from datetime import datetime

app = FastAPI(title="TutorAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("DB_PATH", "tutorai.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            target_score INTEGER,
            current_score INTEGER,
            test_date TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            date TEXT NOT NULL,
            duration_mins INTEGER NOT NULL,
            section TEXT NOT NULL,
            topics_covered TEXT,
            practice_score INTEGER,
            notes TEXT,
            rating TEXT,
            lesson_plan TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS practice_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            date TEXT NOT NULL,
            section TEXT NOT NULL,
            score INTEGER NOT NULL,
            notes TEXT
        );
    """)
    conn.commit()
    conn.close()

init_db()

class StudentCreate(BaseModel):
    name: str
    target_score: Optional[int] = None
    current_score: Optional[int] = None
    test_date: Optional[str] = None

class SessionCreate(BaseModel):
    student_name: str
    date: str
    duration_mins: int
    section: str
    topics_covered: Optional[str] = None
    practice_score: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[str] = None

class LessonPlanRequest(BaseModel):
    student_name: str
    section: str
    topics: str
    duration_mins: int
    current_score: Optional[int] = None
    target_score: Optional[int] = None
    weak_areas: Optional[str] = None

class PracticeScoreCreate(BaseModel):
    student_name: str
    date: str
    section: str
    score: int
    notes: Optional[str] = None

@app.get("/students")
def list_students():
    conn = get_db()
    rows = conn.execute("SELECT * FROM students ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/students", status_code=201)
def create_student(s: StudentCreate):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO students (name, target_score, current_score, test_date) VALUES (?,?,?,?)",
            (s.name, s.target_score, s.current_score, s.test_date)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="Student already exists")
    conn.close()
    return {"message": "Student created"}

@app.put("/students/{name}")
def update_student(name: str, s: StudentCreate):
    conn = get_db()
    conn.execute(
        "UPDATE students SET target_score=?, current_score=?, test_date=? WHERE name=?",
        (s.target_score, s.current_score, s.test_date, name)
    )
    conn.commit()
    conn.close()
    return {"message": "Updated"}

@app.get("/sessions")
def list_sessions(student: Optional[str] = None):
    conn = get_db()
    if student:
        rows = conn.execute(
            "SELECT * FROM sessions WHERE student_name=? ORDER BY date DESC", (student,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM sessions ORDER BY date DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/sessions", status_code=201)
def create_session(s: SessionCreate):
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (student_name, date, duration_mins, section, topics_covered, practice_score, notes, rating) VALUES (?,?,?,?,?,?,?,?)",
        (s.student_name, s.date, s.duration_mins, s.section, s.topics_covered, s.practice_score, s.notes, s.rating)
    )
    conn.commit()
    conn.close()
    return {"message": "Session logged"}

@app.get("/scores/{student_name}")
def get_scores(student_name: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM practice_scores WHERE student_name=? ORDER BY date ASC", (student_name,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/scores", status_code=201)
def add_score(score: PracticeScoreCreate):
    conn = get_db()
    conn.execute(
        "INSERT INTO practice_scores (student_name, date, section, score, notes) VALUES (?,?,?,?,?)",
        (score.student_name, score.date, score.section, score.score, score.notes)
    )
    conn.commit()
    conn.close()
    return {"message": "Score recorded"}

@app.post("/generate-lesson-plan")
def generate_lesson_plan(req: LessonPlanRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)

    score_context = ""
    if req.current_score and req.target_score:
        gap = req.target_score - req.current_score
        score_context = f"Current score: {req.current_score}. Target score: {req.target_score}. Score gap to close: {gap} points."

    prompt = f"""I am an expert SAT tutor for my student. Create a detailed, structured {req.duration_mins}-minute SAT lesson plan.

Student: {req.student_name}
SAT Section: {req.section}
Topics to cover: {req.topics}
{score_context}
{f"Known weak areas: {req.weak_areas}" if req.weak_areas else ""}

Structure the lesson plan with these exact sections and base the amount of things based on allotted time:
1. WARM-UP: A quick review or activation exercise and/or allow time to review homework if there was assigned homework
2. CONCEPT REVIEW: Targeted instruction for the topics listed
3. PRACTICE PROBLEMS: specific SAT-style practice problems with step-by-step solutions, try to find practice problems from real, previou sats to use
4. STRATEGY TIPS: SAT-specific strategies for this topic (timing, elimination, shortcuts)
5. WRAP-UP: How to check understanding, what to review before next session, and assigned homework that reviews topics covered today

Be specific, practical, and use real SAT terminology. Include approximate time for each section. 
At the end, give an overview of what the session covered to give to student/parent, and make this overview a little less formal and more personable"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    plan_text = message.content[0].text

    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (student_name, date, duration_mins, section, topics_covered, lesson_plan) VALUES (?,?,?,?,?,?)",
        (req.student_name, datetime.now().strftime("%Y-%m-%d"), req.duration_mins, req.section, req.topics, plan_text)
    )
    conn.commit()
    conn.close()

    return {"plan": plan_text}

@app.get("/stats")
def get_stats():
    conn = get_db()
    total_sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
    total_students = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    total_mins = conn.execute("SELECT COALESCE(SUM(duration_mins),0) FROM sessions").fetchone()[0]
    conn.close()
    return {
        "total_sessions": total_sessions,
        "total_students": total_students,
        "total_hours": round(total_mins / 60, 1)
    }

@app.get("/health")
def health():
    return {"status": "ok"}

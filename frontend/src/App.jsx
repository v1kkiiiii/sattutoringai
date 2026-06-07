import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import React from 'react'


const API = import.meta.env.VITE_API_URL || '/api'

const SAT_SECTIONS = ['Math', 'Reading & Writing', 'Full Test']
const SAT_MATH_TOPICS = ['Algebra','Linear equations','Quadratics','Functions','Geometry','Trigonometry','Statistics','Problem solving','Data analysis','Word problems']
const SAT_RW_TOPICS = ['Central ideas','Inferences','Command of evidence','Words in context','Text structure','Cross-text connections','Rhetorical synthesis','Transitions','Boundaries','Form/structure/sense']
const RATINGS = ['Needs support','Making progress','On track','Excelling']

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: { bg: 'rgba(108,140,255,0.15)', text: '#6c8cff' },
    green: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
    orange: { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
    purple: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
    red: { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', ...style }}>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: 26, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', disabled, small }) {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border2)' },
    success: { background: 'var(--accent2)', color: '#0f1117', border: 'none' },
    danger: { background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: small ? '5px 12px' : '8px 16px',
        borderRadius: 8,
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.15s, transform 0.1s',
      }}
    >
      {children}
    </button>
  )
}

function FormGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function ScoreGauge({ current, target }) {
  if (!current) return null
  const pct = Math.min(100, Math.round((current / 1600) * 100))
  const color = current >= 1400 ? 'var(--accent2)' : current >= 1200 ? 'var(--accent)' : 'var(--accent3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{current}</span>
      {target && <span style={{ fontSize: 12, color: 'var(--muted)' }}>/ {target} goal</span>}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ stats, sessions, students }) {
  const recentSessions = sessions.slice(0, 5)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <StatCard label="Total sessions" value={stats.total_sessions} color="var(--accent)" />
        <StatCard label="Students" value={stats.total_students} color="var(--accent4)" />
        <StatCard label="Hours logged" value={stats.total_hours} color="var(--accent2)" />
      </div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recent sessions</div>
        {recentSessions.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '1.5rem' }}>No sessions yet — log your first one!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.student_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.date} · {s.section} · {s.duration_mins} min</div>
                </div>
                {s.rating && <Badge color={s.rating === 'Excelling' ? 'green' : s.rating === 'On track' ? 'blue' : s.rating === 'Making progress' ? 'orange' : 'red'}>{s.rating}</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Lesson Planner ────────────────────────────────────────────────────────────
function LessonPlanner({ students, onRefresh }) {
  const [form, setForm] = useState({ student_name: '', section: 'Math', topics: '', duration_mins: 60, current_score: '', target_score: '', weak_areas: '' })
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const topics = form.section === 'Math' ? SAT_MATH_TOPICS : SAT_RW_TOPICS

  async function generate() {
    if (!form.student_name || !form.topics) return alert('Fill in student name and topics.')
    setLoading(true); setPlan(''); setSaved(false)
    try {
      const res = await api('/generate-lesson-plan', {
        method: 'POST',
        body: { ...form, current_score: form.current_score ? +form.current_score : null, target_score: form.target_score ? +form.target_score : null }
      })
      setPlan(res.plan)
      onRefresh()
    } catch (e) {
      setPlan('Error generating plan. Make sure ANTHROPIC_API_KEY is set on the backend.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <FormGroup label="Student name">
            <input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} placeholder="e.g. Alex Kim" list="students-list" />
            <datalist id="students-list">{students.map(s => <option key={s.name} value={s.name} />)}</datalist>
          </FormGroup>
          <FormGroup label="SAT section">
            <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value, topics: '' }))}>
              {SAT_SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Current score (optional)">
            <input type="number" value={form.current_score} onChange={e => setForm(f => ({ ...f, current_score: e.target.value }))} placeholder="e.g. 1180" min="400" max="1600" />
          </FormGroup>
          <FormGroup label="Target score (optional)">
            <input type="number" value={form.target_score} onChange={e => setForm(f => ({ ...f, target_score: e.target.value }))} placeholder="e.g. 1400" min="400" max="1600" />
          </FormGroup>
          <FormGroup label="Session length">
            <select value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: +e.target.value }))}>
              {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Topics to cover">
            <select value={form.topics} onChange={e => setForm(f => ({ ...f, topics: e.target.value }))}>
              <option value="">Select a topic…</option>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </FormGroup>
        </div>
        <FormGroup label="Known weak areas / extra context">
          <textarea value={form.weak_areas} onChange={e => setForm(f => ({ ...f, weak_areas: e.target.value }))} placeholder="e.g. makes careless errors on multi-step problems, struggles with timing" rows={2} />
        </FormGroup>
        <div style={{ marginTop: 12 }}>
          <Btn onClick={generate} disabled={loading}>
            {loading ? '✦ Generating…' : '✦ Generate lesson plan'}
          </Btn>
        </div>
      </Card>
  
      {(plan || loading) && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 10 }}>Generated lesson plan</div>
          {loading ? (
            <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>Asking Claude to build your lesson plan…</div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: plan
                    .replace(/^## (.*?)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:1rem 0 4px">$1</h3>')
                    .replace(/^### (.*?)$/gm, '<h4 style="font-size:13px;font-weight:600;margin:0.75rem 0 4px">$1</h4>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^- (.*?)$/gm, '<div style="padding:2px 0 2px 12px;border-left:2px solid var(--border2)">$1</div>')
                    .replace(/^\d+\. (.*?)$/gm, '<div style="padding:2px 0">$1</div>')
                    .replace(/\n\n/g, '<br/>')
                }}
            />
          )}
        </Card>
      )}
    </div>
  )
}

// ── Log Session ───────────────────────────────────────────────────────────────
function LogSession({ students, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ student_name: '', date: today, duration_mins: 60, section: 'Math', topics_covered: '', practice_score: '', notes: '', rating: 'On track' })
  const [success, setSuccess] = useState(false)

  async function submit() {
    if (!form.student_name) return alert('Enter a student name.')
    try {
      await api('/sessions', {
        method: 'POST',
        body: { ...form, duration_mins: +form.duration_mins, practice_score: form.practice_score ? +form.practice_score : null }
      })
      setSuccess(true)
      setForm(f => ({ ...f, student_name: '', notes: '', practice_score: '' }))
      setTimeout(() => setSuccess(false), 3000)
      onRefresh()
    } catch (e) { alert('Error logging session.') }
  }

  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FormGroup label="Student name">
          <input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} placeholder="e.g. Alex Kim" list="students-log" />
          <datalist id="students-log">{students.map(s => <option key={s.name} value={s.name} />)}</datalist>
        </FormGroup>
        <FormGroup label="Date">
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormGroup>
        <FormGroup label="SAT section">
          <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
            {SAT_SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Duration (min)">
          <input type="number" value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))} min="15" max="180" />
        </FormGroup>
        <FormGroup label="Topics covered">
          <input value={form.topics_covered} onChange={e => setForm(f => ({ ...f, topics_covered: e.target.value }))} placeholder="e.g. Linear equations, word problems" />
        </FormGroup>
        <FormGroup label="Practice score (optional)">
          <input type="number" value={form.practice_score} onChange={e => setForm(f => ({ ...f, practice_score: e.target.value }))} placeholder="e.g. 680" min="200" max="800" />
        </FormGroup>
        <FormGroup label="Progress rating">
          <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
            {RATINGS.map(r => <option key={r}>{r}</option>)}
          </select>
        </FormGroup>
      </div>
      <FormGroup label="Session notes">
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What went well? What needs more work?" rows={3} />
      </FormGroup>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn onClick={submit} variant="success">+ Log session</Btn>
        {success && <span style={{ fontSize: 13, color: 'var(--accent2)' }}>✓ Session logged!</span>}
      </div>
    </Card>
  )
}

// ── Students ──────────────────────────────────────────────────────────────────
function Students({ students, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', target_score: '', current_score: '', test_date: '' })
  const [selected, setSelected] = useState(null)
  const [scores, setScores] = useState([])
  const [scoreForm, setScoreForm] = useState({ section: 'Math', score: '', date: new Date().toISOString().slice(0, 10), notes: '' })

  async function addStudent() {
    if (!form.name) return
    try {
      await api('/students', { method: 'POST', body: { ...form, target_score: form.target_score ? +form.target_score : null, current_score: form.current_score ? +form.current_score : null } })
      setForm({ name: '', target_score: '', current_score: '', test_date: '' })
      setShowAdd(false)
      onRefresh()
    } catch (e) { alert('Student may already exist.') }
  }

  async function loadScores(name) {
    const data = await api(`/scores/${encodeURIComponent(name)}`)
    setScores(data)
  }

  async function addScore() {
    if (!scoreForm.score || !selected) return
    await api('/scores', { method: 'POST', body: { student_name: selected.name, ...scoreForm, score: +scoreForm.score } })
    loadScores(selected.name)
    setScoreForm(f => ({ ...f, score: '', notes: '' }))
  }

  function selectStudent(s) {
    setSelected(s)
    loadScores(s.name)
  }

  const mathScores = scores.filter(s => s.section === 'Math')
  const rwScores = scores.filter(s => s.section === 'Reading & Writing')

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Students</span>
          <Btn small variant="secondary" onClick={() => setShowAdd(!showAdd)}>+ Add</Btn>
        </div>
        {showAdd && (
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input type="number" placeholder="Current score" value={form.current_score} onChange={e => setForm(f => ({ ...f, current_score: e.target.value }))} />
              <input type="number" placeholder="Target score" value={form.target_score} onChange={e => setForm(f => ({ ...f, target_score: e.target.value }))} />
              <input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} />
              <Btn small onClick={addStudent}>Save</Btn>
            </div>
          </Card>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {students.map(s => (
            <div key={s.name} onClick={() => selectStudent(s)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${selected?.name === s.name ? 'var(--accent)' : 'var(--border)'}`, background: selected?.name === s.name ? 'rgba(108,140,255,0.1)' : 'var(--bg2)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
              {s.current_score && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.current_score} → {s.target_score || '?'}</div>}
            </div>
          ))}
          {students.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>No students yet</div>}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontSize: 13 }}>Select a student to view their progress</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{selected.name}</div>
                  {selected.test_date && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Test date: {selected.test_date}</div>}
                </div>
                {selected.current_score && <Badge color="blue">{selected.current_score} / 1600</Badge>}
              </div>
              {selected.current_score && <div style={{ marginTop: 12 }}><ScoreGauge current={selected.current_score} target={selected.target_score} /></div>}
            </Card>

            {scores.length > 0 && (
              <Card>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Score history</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={scores.map(s => ({ date: s.date, score: s.score, section: s.section }))}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis domain={[200, 800]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            <Card>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Log practice score</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <FormGroup label="Section">
                  <select value={scoreForm.section} onChange={e => setScoreForm(f => ({ ...f, section: e.target.value }))}>
                    <option>Math</option><option>Reading & Writing</option>
                  </select>
                </FormGroup>
                <FormGroup label="Score (200–800)">
                  <input type="number" value={scoreForm.score} onChange={e => setScoreForm(f => ({ ...f, score: e.target.value }))} placeholder="680" min="200" max="800" />
                </FormGroup>
                <FormGroup label="Date">
                  <input type="date" value={scoreForm.date} onChange={e => setScoreForm(f => ({ ...f, date: e.target.value }))} />
                </FormGroup>
              </div>
              <Btn small onClick={addScore}>+ Add score</Btn>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ── History ───────────────────────────────────────────────────────────────────
function History({ sessions }) {
  const [filter, setFilter] = useState('')
  const filtered = filter ? sessions.filter(s => s.student_name.toLowerCase().includes(filter.toLowerCase())) : sessions

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input placeholder="Filter by student name…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 300 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '2rem' }}>No sessions found.</div>}
        {filtered.map(s => (
          <Card key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{s.student_name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {s.date} · {s.section} · {s.duration_mins} min
                  {s.topics_covered && ` · ${s.topics_covered}`}
                  {s.practice_score && ` · Score: ${s.practice_score}`}
                </div>
                {s.notes && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 6 }}>{s.notes}</div>}
              </div>
              {s.rating && <Badge color={s.rating === 'Excelling' ? 'green' : s.rating === 'On track' ? 'blue' : s.rating === 'Making progress' ? 'orange' : 'red'}>{s.rating}</Badge>}
            </div>
            {s.lesson_plan && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>View lesson plan</summary>
                <pre style={{ fontFamily: 'var(--font)', fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 8, color: 'var(--muted)', lineHeight: 1.6 }}>{s.lesson_plan}</pre>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'planner', label: 'Lesson planner', icon: '✦' },
  { id: 'log', label: 'Log session', icon: '＋' },
  { id: 'students', label: 'Students', icon: '◉' },
  { id: 'history', label: 'History', icon: '≡' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({ total_sessions: 0, total_students: 0, total_hours: 0 })

  async function refresh() {
    try {
      const [s, st, stats] = await Promise.all([
        api('/sessions'), api('/students'), api('/stats')
      ])
      setSessions(s); setStudents(st); setStats(stats)
    } catch (e) {
      console.warn('Backend not reachable — running in offline mode')
    }
  }

  useEffect(() => { refresh() }, [])

  const titles = { dashboard: 'Dashboard', planner: 'Lesson planner', log: 'Log session', students: 'Students', history: 'Session history' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', minHeight: '100vh' }}>
      <aside style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--text)' }}>TutorAI</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>SAT prep dashboard</div>
        </div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 1.25rem',
            background: page === n.id ? 'rgba(108,140,255,0.12)' : 'transparent',
            border: 'none', borderLeft: page === n.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: page === n.id ? 'var(--text)' : 'var(--muted)', fontSize: 13, fontWeight: page === n.id ? 500 : 400,
            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: 14, opacity: 0.8 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </aside>

      <main style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{titles[page]}</h1>
        </div>
        {page === 'dashboard' && <Dashboard stats={stats} sessions={sessions} students={students} />}
        {page === 'planner' && <LessonPlanner students={students} onRefresh={refresh} />}
        {page === 'log' && <LogSession students={students} onRefresh={refresh} />}
        {page === 'students' && <Students students={students} onRefresh={refresh} />}
        {page === 'history' && <History sessions={sessions} />}
      </main>
    </div>
  )
}

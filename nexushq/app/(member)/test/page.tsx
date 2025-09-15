'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Zap, X } from 'lucide-react'
import { SectionHeader, AIBadge, ScoreRing, EmptyState, Spinner } from '@/components/ui'
import { toast } from 'sonner'

export default function WeeklyTestPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [activeTest, setActiveTest] = useState<any>(null)
  const [mode, setMode] = useState<'list' | 'taking' | 'results'>('list')

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/tests')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: skillTrack } = useQuery({
    queryKey: ['skill-track-current'],
    queryFn: async () => {
      const res = await fetch('/api/skill-tracks/current')
      if (!res.ok) return null
      return res.json()
    },
  })

  const generateTest = useMutation({
    mutationFn: async (topic: string) => {
      const res = await fetch('/api/tests/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, skill_track_id: skillTrack?.id }),
      })
      if (!res.ok) throw new Error('Generation failed')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      toast.success('Test generated! 50 questions ready.')
      setActiveTest(data); setMode('taking')
    },
    onError: () => toast.error('Failed to generate test'),
  })

  if (mode === 'taking' && activeTest) {
    return <TestInterface test={activeTest} onComplete={(results: Record<string, unknown>) => { setActiveTest({ ...activeTest, ...results }); setMode('results') }} onExit={() => setMode('list')} />
  }

  if (mode === 'results' && activeTest) {
    return <TestResults test={activeTest} onBack={() => setMode('list')} />
  }

  return (
    <div>
      <SectionHeader title="Weekly Test" sub="Assess your skill knowledge with 50 AI-generated questions" />

      {/* Current skill track */}
      {skillTrack && (
        <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#4f8ef7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Week's Skill</span>
                {skillTrack.topic_approved && <span style={{ fontSize: 11, background: 'rgba(63,185,80,0.1)', color: '#3fb950', borderRadius: 100, padding: '2px 8px' }}>✓ Approved</span>}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', fontFamily: 'Syne, sans-serif' }}>{skillTrack.topic}</div>
              <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
                {skillTrack.learning_hours?.toFixed(1) || 0}h logged learning this week
              </div>
            </div>
            {skillTrack.topic_approved ? (
              <button className="btn-primary" onClick={() => generateTest.mutate(skillTrack.topic)} disabled={generateTest.isPending}>
                {generateTest.isPending ? <><Spinner size={14} /> Generating 50 questions...</> : <><Zap size={14} /> Start Test</>}
              </button>
            ) : (
              <div style={{ fontSize: 13, color: '#f5a623', background: 'rgba(245,166,35,0.1)', borderRadius: 8, padding: '10px 16px' }}>
                ⏳ Waiting for admin approval
              </div>
            )}
          </div>
        </div>
      )}

      {!skillTrack && (
        <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <EmptyState icon="📚" title="No skill selected" sub="Go to Skill Track to select your topic for this week" action={<a href="/skill-track" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Skill Track</a>} />
        </div>
      )}

      {/* Past tests */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Test History</div>
      {tests.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <EmptyState icon="🧪" title="No tests yet" sub="Complete your first weekly test to see results here" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map((test: any) => (
            <div key={test.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <ScoreRing score={test.total_score || 0} size={52} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{test.topic}</div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>
                  {test.questions?.length || 0} questions •
                  MCQ: {test.mcq_score?.toFixed(0) || 0}% •
                  Written: {test.written_score?.toFixed(0) || 0}%
                </div>
                {test.graded_at && <div style={{ fontSize: 11, color: '#484f58', marginTop: 3 }}>Graded {new Date(test.graded_at).toLocaleDateString()}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, borderRadius: 100, padding: '4px 12px',
                  background: (test.total_score || 0) >= 80 ? 'rgba(63,185,80,0.1)' : (test.total_score || 0) >= 60 ? 'rgba(245,166,35,0.1)' : 'rgba(248,81,73,0.1)',
                  color: (test.total_score || 0) >= 80 ? '#3fb950' : (test.total_score || 0) >= 60 ? '#f5a623' : '#f85149',
                }}>{(test.total_score || 0) >= 80 ? '🏆 Excellent' : (test.total_score || 0) >= 60 ? '👍 Good' : '📈 Needs Work'}</span>
                {test.status === 'graded' && (
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setActiveTest(test); setMode('results') }}>View Results</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TestInterface({ test, onComplete, onExit }: any) {
  const [answers, setAnswers] = useState<Record<string, string>>(test.answers || {})
  const [currentQ, setCurrentQ] = useState(0)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [section, setSection] = useState<'A' | 'B' | 'C'>('A')
  const [timeLeft, setTimeLeft] = useState((test.time_limit_mins || 60) * 60)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const timerRef = useRef<any>(null)
  const qc = useQueryClient()

  const questions = test.questions || []
  const mcqs = questions.filter((q: any) => q.type === 'mcq')
  const written = questions.filter((q: any) => q.type === 'short_written')
  const scenarios = questions.filter((q: any) => q.type === 'scenario')
  const sectionQs = section === 'A' ? mcqs : section === 'B' ? written : scenarios
  const q = sectionQs[currentQ]

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
        if (t === 300) toast.warning('5 minutes remaining!')
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Autosave every 30s
  useEffect(() => {
    const save = setInterval(async () => {
      await fetch(`/api/tests/${test.id}/autosave`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) })
    }, 30000)
    return () => clearInterval(save)
  }, [answers])

  const handleSubmit = async () => {
    clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tests/${test.id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) })
      const data = await res.json()
      qc.invalidateQueries({ queryKey: ['tests'] })
      onComplete(data)
    } catch { toast.error('Failed to submit test') }
    finally { setSubmitting(false) }
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const answered = Object.keys(answers).length
  const total = questions.length

  return (
    <div style={{ minHeight: '100vh', background: '#060912' }}>
      {/* Header */}
      <div style={{ background: '#0d1117', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn-ghost" onClick={onExit} style={{ fontSize: 12 }}><X size={14} /> Exit</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>{test.topic}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: timeLeft < 300 ? '#f85149' : '#e6edf3' }}>
            <Clock size={14} />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: '#8b949e' }}>{answered}/{total} answered</div>
        </div>
        <button className="btn-primary" onClick={() => setShowConfirm(true)} disabled={submitting} style={{ fontSize: 13 }}>
          {submitting ? 'Submitting...' : 'Submit Test'}
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Left: question nav */}
        <div style={{ width: 200, background: '#0d1117', borderRight: '1px solid #30363d', padding: 16, overflowY: 'auto' }}>
          {/* Section tabs */}
          {(['A', 'B', 'C'] as const).map(s => (
            <button key={s} onClick={() => { setSection(s); setCurrentQ(0) }} style={{
              width: '100%', padding: '8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginBottom: 4,
              border: 'none', background: section === s ? 'rgba(79,142,247,0.15)' : 'transparent',
              color: section === s ? '#4f8ef7' : '#8b949e', textAlign: 'left', fontWeight: section === s ? 600 : 400,
            }}>
              Section {s} ({s === 'A' ? `${mcqs.length} MCQ` : s === 'B' ? `${written.length} Written` : `${scenarios.length} Scenario`})
            </button>
          ))}
          <div style={{ height: 1, background: '#30363d', margin: '10px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {sectionQs.map((q: any, i: number) => (
              <button key={i} onClick={() => setCurrentQ(i)} style={{
                width: '100%', aspectRatio: '1', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none',
                background: currentQ === i ? '#4f8ef7' : answers[q.id] ? 'rgba(63,185,80,0.2)' : flagged.has(q.id) ? 'rgba(245,166,35,0.2)' : '#161b22',
                color: currentQ === i ? '#fff' : answers[q.id] ? '#3fb950' : flagged.has(q.id) ? '#f5a623' : '#8b949e',
              }}>{i + 1}</button>
            ))}
          </div>
        </div>

        {/* Right: question */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {q ? (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Q{q.number || currentQ + 1}</span>
                  <span style={{
                    fontSize: 11, borderRadius: 100, padding: '2px 8px',
                    background: q.difficulty === 'easy' ? 'rgba(63,185,80,0.1)' : q.difficulty === 'hard' ? 'rgba(248,81,73,0.1)' : 'rgba(245,166,35,0.1)',
                    color: q.difficulty === 'easy' ? '#3fb950' : q.difficulty === 'hard' ? '#f85149' : '#f5a623',
                  }}>{q.difficulty}</span>
                  {q.topic_area && <span className="tag">{q.topic_area}</span>}
                </div>
                <button onClick={() => setFlagged(prev => { const s = new Set(prev); s.has(q.id) ? s.delete(q.id) : s.add(q.id); return s })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: flagged.has(q.id) ? '#f5a623' : '#8b949e', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Flag size={13} /> {flagged.has(q.id) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>

              <p style={{ fontSize: 17, color: '#e6edf3', lineHeight: 1.7, marginBottom: 28 }}>{q.question}</p>

              {/* MCQ options */}
              {q.type === 'mcq' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt: string, i: number) => {
                    const letter = ['A', 'B', 'C', 'D'][i]
                    const selected = answers[q.id] === letter
                    return (
                      <button key={letter} onClick={() => setAnswers({ ...answers, [q.id]: letter })} style={{
                        padding: '14px 18px', borderRadius: 10, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                        border: `1px solid ${selected ? '#4f8ef7' : '#30363d'}`,
                        background: selected ? 'rgba(79,142,247,0.1)' : '#161b22',
                        color: selected ? '#4f8ef7' : '#e6edf3',
                        transition: 'all 0.15s', display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, flexShrink: 0, color: selected ? '#4f8ef7' : '#484f58' }}>{letter}</span>
                        {opt.replace(/^[A-D]\)\s*/, '')}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Written answer */}
              {(q.type === 'short_written' || q.type === 'scenario') && (
                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>
                    {q.type === 'short_written' ? 'Your answer (2–4 sentences)' : 'Your response (1–3 paragraphs)'}
                  </label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="input-dark"
                    rows={q.type === 'scenario' ? 8 : 4}
                    placeholder="Type your answer here..."
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>
                    {(answers[q.id] || '').split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <button className="btn-secondary" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <button className="btn-primary" onClick={() => setCurrentQ(Math.min(sectionQs.length - 1, currentQ + 1))} disabled={currentQ >= sectionQs.length - 1}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : <EmptyState title="No questions in this section" />}
        </div>
      </div>

      {/* Submit confirm */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>Submit Test?</div>
            <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 20 }}>
              You've answered {answered}/{total} questions. {flagged.size > 0 && `${flagged.size} questions flagged for review. `}This cannot be undone.
            </p>
            {answered < total && (
              <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, color: '#f5a623', fontSize: 13 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {total - answered} questions are unanswered
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Review First</button>
              <button className="btn-primary" onClick={() => { setShowConfirm(false); handleSubmit() }} disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TestResults({ test, onBack }: any) {
  const total = test.total_score || 0
  const mcq = test.mcq_score || 0
  const written = test.written_score || 0
  const questions = test.questions || []
  const answers = test.answers || {}
  const evals = test.ai_evaluation || {}

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn-ghost" onClick={onBack}><ChevronLeft size={14} /> Back</button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#e6edf3' }}>Test Results</h1>
        {total >= 85 && <span style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950', borderRadius: 100, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>🏆 Top Performer</span>}
      </div>

      {/* Score summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, marginBottom: 28 }}>
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={total} size={120} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Final Score</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{test.topic}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Section A — MCQ (40%)', score: mcq, color: '#4f8ef7' },
            { label: 'Section B — Written (35%)', score: written, color: '#7c6af5' },
            { label: 'Section C — Scenario (25%)', score: test.scenario_score || 0, color: '#06d6a0' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#e6edf3' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.score.toFixed(1)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${s.score}%`, background: s.color }} />
              </div>
            </div>
          ))}
          {test.ai_feedback && (
            <div style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 10, padding: '14px 16px' }}>
              <AIBadge label="AI Feedback" />
              <p style={{ fontSize: 13, color: '#c4b5fd', marginTop: 8, lineHeight: 1.6 }}>{test.ai_feedback}</p>
            </div>
          )}
        </div>
      </div>

      {/* Per-question review */}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Question Review</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.slice(0, 20).map((q: any) => {
          const ev = evals[q.id]
          const userAnswer = answers[q.id]
          const correct = q.type === 'mcq' ? userAnswer === q.correct_answer : null
          return (
            <div key={q.id} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{q.type === 'mcq' ? (correct ? '✅' : '❌') : ev?.score >= (q.rubric?.max_score * 0.7) ? '✅' : '📝'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e6edf3', marginBottom: 6 }}>{q.question}</div>
                  {q.type === 'mcq' && (
                    <div style={{ fontSize: 12, color: correct ? '#3fb950' : '#f85149' }}>
                      Your answer: {userAnswer || 'Not answered'} {!correct && `(Correct: ${q.correct_answer})`}
                    </div>
                  )}
                  {ev?.feedback && (
                    <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6, background: '#161b22', borderRadius: 6, padding: '8px 10px' }}>
                      💡 {ev.feedback}
                    </div>
                  )}
                </div>
                {ev?.score !== undefined && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4f8ef7', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                    {ev.score}/{q.rubric?.max_score || 10}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

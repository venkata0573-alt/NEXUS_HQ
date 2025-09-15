'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { BookOpen, CheckCircle, Clock, ExternalLink, Plus, Zap } from 'lucide-react'
import { SectionHeader, AIBadge, EmptyState, Spinner } from '@/components/ui'
import { SkillScoreTrendChart } from '@/components/charts'
import { toast } from 'sonner'

const SKILL_CATEGORIES = {
  'AI & ML': ['LangChain Agents', 'Prompt Engineering', 'RAG Systems', 'Fine-tuning LLMs', 'Vector Databases', 'MLOps'],
  'Backend': ['FastAPI', 'PostgreSQL Advanced', 'Redis & Caching', 'GraphQL', 'gRPC', 'Microservices'],
  'Frontend': ['React Advanced Patterns', 'Next.js 14', 'TypeScript Deep Dive', 'CSS Architecture', 'Web Performance'],
  'DevOps': ['Docker & Kubernetes', 'CI/CD Pipelines', 'AWS Services', 'Terraform', 'Monitoring & Observability'],
  'Architecture': ['System Design', 'Event-Driven Architecture', 'DDD', 'API Design', 'Database Design'],
  'Security': ['OAuth & Auth Patterns', 'API Security', 'OWASP Top 10', 'Cryptography Basics'],
  'Soft Skills': ['Technical Writing', 'Code Review Best Practices', 'Agile & Scrum', 'Engineering Leadership'],
}

export default function SkillTrackPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [selectedTopic, setSelectedTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [showSelector, setShowSelector] = useState(false)
  const isAdmin = session?.user?.role === 'admin'

  const { data: currentTrack } = useQuery({
    queryKey: ['skill-track-current'],
    queryFn: async () => {
      const res = await fetch('/api/skill-tracks/current')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: allTracks = [] } = useQuery({
    queryKey: ['skill-tracks'],
    queryFn: async () => {
      const res = await fetch('/api/skill-tracks')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Admin: get all pending tracks
  const { data: pendingTracks = [] } = useQuery({
    queryKey: ['pending-skill-tracks'],
    queryFn: async () => {
      if (!isAdmin) return []
      const res = await fetch('/api/skill-tracks/pending')
      if (!res.ok) return []
      return res.json()
    },
    enabled: isAdmin,
  })

  const selectTopic = useMutation({
    mutationFn: async (topic: string) => {
      const res = await fetch('/api/skill-tracks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skill-track-current'] }); qc.invalidateQueries({ queryKey: ['skill-tracks'] }); toast.success('Skill topic selected!'); setShowSelector(false) },
    onError: () => toast.error('Failed to select topic'),
  })

  const approveTopic = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/skill-tracks/${id}/approve`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pending-skill-tracks'] }); toast.success('Topic approved!') },
    onError: () => toast.error('Failed to approve'),
  })

  return (
    <div>
      <SectionHeader title="Skill Development" sub="Track your weekly learning and growth" />

      {/* Admin: pending approvals */}
      {isAdmin && pendingTracks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', marginBottom: 10 }}>⏳ Pending Approvals ({pendingTracks.length})</div>
          {pendingTracks.map((track: any) => (
            <div key={track.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#e6edf3', fontWeight: 500 }}>{track.topic}</div>
                <div style={{ fontSize: 12, color: '#8b949e' }}>{track.user?.full_name}</div>
              </div>
              <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => approveTopic.mutate(track.id)}>
                ✓ Approve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current track */}
      {currentTrack ? (
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Week</span>
                  {currentTrack.topic_approved ? (
                    <span style={{ fontSize: 11, background: 'rgba(63,185,80,0.1)', color: '#3fb950', borderRadius: 100, padding: '2px 10px' }}>✓ Approved</span>
                  ) : (
                    <span style={{ fontSize: 11, background: 'rgba(245,166,35,0.1)', color: '#f5a623', borderRadius: 100, padding: '2px 10px' }}>⏳ Pending</span>
                  )}
                </div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>{currentTrack.topic}</h2>
                <div style={{ fontSize: 13, color: '#8b949e', marginTop: 6 }}>
                  {currentTrack.learning_hours || 0}h studied • Test {currentTrack.test_score ? `score: ${currentTrack.test_score.toFixed(0)}%` : 'not taken yet'}
                </div>
              </div>
              {currentTrack.topic_approved && (
                <a href="/test">
                  <button className="btn-primary">
                    <Zap size={14} /> Take Test
                  </button>
                </a>
              )}
            </div>

            {/* Resources */}
            {currentTrack.resources?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>AI-curated learning resources:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {currentTrack.resources.map((r: any, i: number) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#484f58')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {r.type === 'video' ? '🎬' : r.type === 'docs' ? '📖' : r.type === 'exercise' ? '💻' : '📄'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#e6edf3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: 11, color: '#484f58', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                        </div>
                        <ExternalLink size={11} style={{ color: '#484f58', flexShrink: 0, marginTop: 2 }} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        !showSelector && (
          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <EmptyState icon="📚" title="No skill topic this week" sub="Select a topic to start your learning journey and unlock your Friday test"
              action={<button className="btn-primary" onClick={() => setShowSelector(true)}><Plus size={14} /> Select Topic</button>} />
          </div>
        )
      )}

      {/* Topic selector */}
      {(showSelector || !currentTrack) && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: 16 }}>Select This Week's Skill Topic</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(SKILL_CATEGORIES).map(([category, topics]) => (
              <div key={category}>
                <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {topics.map(topic => (
                    <button key={topic} onClick={() => setSelectedTopic(topic)} style={{
                      padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${selectedTopic === topic ? '#4f8ef7' : '#30363d'}`,
                      background: selectedTopic === topic ? 'rgba(79,142,247,0.15)' : '#161b22',
                      color: selectedTopic === topic ? '#4f8ef7' : '#8b949e',
                      transition: 'all 0.15s',
                    }}>{topic}</button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Custom Topic</div>
              <input value={customTopic} onChange={e => { setCustomTopic(e.target.value); if (e.target.value) setSelectedTopic(e.target.value) }}
                className="input-dark" placeholder="Enter a custom topic..." style={{ maxWidth: 300, height: 36, fontSize: 13 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {currentTrack && <button className="btn-secondary" onClick={() => setShowSelector(false)}>Cancel</button>}
              <button className="btn-primary" onClick={() => selectTopic.mutate(selectedTopic || customTopic)} disabled={(!selectedTopic && !customTopic) || selectTopic.isPending}>
                {selectTopic.isPending ? <><Spinner size={14} /> Selecting...</> : 'Confirm Topic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {allTracks.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Learning History</div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <SkillScoreTrendChart data={allTracks.filter((t: any) => t.test_score).map((t: any, i: number) => ({ week: `Wk ${i + 1}`, score: t.test_score, topic: t.topic }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allTracks.slice(0, 8).map((track: any) => (
              <div key={track.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: track.topic_approved ? 'rgba(63,185,80,0.1)' : 'rgba(139,148,158,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {track.topic_approved ? <CheckCircle size={16} style={{ color: '#3fb950' }} /> : <Clock size={16} style={{ color: '#8b949e' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{track.topic}</div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                    Week {track.week_number}, {track.year} • {track.learning_hours || 0}h studied
                  </div>
                </div>
                {track.test_score !== null && track.test_score !== undefined ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: track.test_score >= 80 ? '#3fb950' : track.test_score >= 60 ? '#f5a623' : '#f85149' }}>
                      {track.test_score.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#484f58' }}>test score</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: '#484f58' }}>No test</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

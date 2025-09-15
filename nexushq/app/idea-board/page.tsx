'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Plus, ThumbsUp, X, Zap, Search } from 'lucide-react'
import { SectionHeader, Avatar, AIBadge, EmptyState, Spinner } from '@/components/ui'
import { toast } from 'sonner'

const CATEGORIES = [
  { id: 'product', label: 'Product', color: '#4f8ef7' },
  { id: 'process', label: 'Process', color: '#3fb950' },
  { id: 'tech', label: 'Tech', color: '#7c6af5' },
  { id: 'culture', label: 'Culture', color: '#f5a623' },
  { id: 'client', label: 'Client', color: '#f85149' },
]

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: 'rgba(139,148,158,0.1)', color: '#8b949e' },
  under_review: { bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
  approved: { bg: 'rgba(63,185,80,0.1)', color: '#3fb950' },
  implementing: { bg: 'rgba(79,142,247,0.1)', color: '#4f8ef7' },
  done: { bg: 'rgba(6,214,160,0.1)', color: '#06d6a0' },
  archived: { bg: 'rgba(72,79,88,0.1)', color: '#484f58' },
}

export default function IdeaBoardPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const res = await fetch('/api/ideas')
      if (!res.ok) return []
      return res.json()
    },
  })

  const vote = useMutation({
    mutationFn: async ({ id, voted }: { id: string; voted: boolean }) => {
      const res = await fetch(`/api/ideas/${id}/vote`, { method: voted ? 'DELETE' : 'POST' })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
    onError: () => toast.error('Failed to vote'),
  })

  const analyzeAI = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ideas/${id}/analyze`, { method: 'POST' })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      setSelected((prev: any) => prev ? { ...prev, ai_analysis: data.ai_analysis } : prev)
      toast.success('AI analysis complete!')
    },
    onError: () => toast.error('AI analysis failed'),
  })

  const filtered = ideas.filter((i: any) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && i.category !== filterCat) return false
    return true
  }).sort((a: any, b: any) => b.upvotes - a.upvotes)

  const totalVotes = ideas.reduce((s: number, i: any) => s + i.upvotes, 0)
  const myIdeas = ideas.filter((i: any) => i.submitted_by === session?.user?.id).length

  return (
    <div>
      <SectionHeader
        title="Idea Board"
        sub={`${ideas.length} ideas • ${totalVotes} total votes`}
        action={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Share Idea
          </button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Ideas', value: ideas.length, color: '#4f8ef7' },
          { label: 'Approved', value: ideas.filter((i: any) => i.status === 'approved').length, color: '#3fb950' },
          { label: 'My Ideas', value: myIdeas, color: '#7c6af5' },
          { label: 'Total Votes', value: totalVotes, color: '#f5a623' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#484f58' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..." className="input-dark" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setFilterCat('')} style={{
            padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', border: 'none',
            background: !filterCat ? '#4f8ef7' : '#161b22', color: !filterCat ? '#fff' : '#8b949e',
          }}>All</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)} style={{
              padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', border: 'none',
              background: filterCat === c.id ? c.color : '#161b22',
              color: filterCat === c.id ? '#fff' : '#8b949e',
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* Ideas grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48 }}>
          <EmptyState icon="💡" title="No ideas yet" sub="Be the first to share an idea with your team!" action={<button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Share Idea</button>} />
        </div>
      ) : (
        <div style={{ columns: 3, columnGap: 16 }}>
          {filtered.map((idea: any) => {
            const cat = CATEGORIES.find(c => c.id === idea.category) || CATEGORIES[0]
            const voted = idea.voters?.includes(session?.user?.id)
            const ss = STATUS_STYLES[idea.status] || STATUS_STYLES.open
            return (
              <div key={idea.id} style={{ breakInside: 'avoid', marginBottom: 16 }}>
                <div className="card" style={{ padding: 18, cursor: 'pointer' }}
                  onClick={() => setSelected(idea)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: `${cat.color}18`, borderRadius: 100, padding: '3px 10px' }}>{cat.label}</span>
                    <span style={{ fontSize: 11, borderRadius: 100, padding: '3px 10px', background: ss.bg, color: ss.color }}>{idea.status.replace('_', ' ')}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 6, lineHeight: 1.4 }}>{idea.title}</h3>
                  {idea.description && (
                    <p style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {idea.description}
                    </p>
                  )}
                  {idea.ai_analysis && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Impact', value: idea.ai_analysis.impact_score, color: '#3fb950' },
                        { label: 'Effort', value: idea.ai_analysis.effort_score, color: '#f5a623' },
                      ].map(s => (
                        <div key={s.label} style={{ fontSize: 11, color: s.color, background: `${s.color}15`, borderRadius: 4, padding: '2px 8px' }}>
                          {s.label}: {s.value}/10
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {idea.submitter && <Avatar user={idea.submitter} size={20} />}
                      <span style={{ fontSize: 11, color: '#8b949e' }}>{idea.submitter?.full_name?.split(' ')[0] || 'Unknown'}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); vote.mutate({ id: idea.id, voted }) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: voted ? 'rgba(79,142,247,0.15)' : '#161b22',
                        border: `1px solid ${voted ? 'rgba(79,142,247,0.4)' : '#30363d'}`,
                        borderRadius: 100, padding: '4px 10px',
                        fontSize: 12, color: voted ? '#4f8ef7' : '#8b949e', cursor: 'pointer',
                      }}>
                      <ThumbsUp size={11} /> {idea.upvotes}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Idea Modal */}
      {showNew && <NewIdeaModal onClose={() => setShowNew(false)} session={session} />}

      {/* Idea Detail */}
      {selected && <IdeaDetailModal idea={selected} session={session} onClose={() => setSelected(null)} onAnalyze={() => analyzeAI.mutate(selected.id)} analyzing={analyzeAI.isPending} />}
    </div>
  )
}

function NewIdeaModal({ onClose, session }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', description: '', category: 'product', tags: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required')
    setLoading(true)
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] }),
      })
      if (!res.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Idea shared! 💡'); onClose()
    } catch { toast.error('Failed to submit idea') }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>💡 Share an Idea</h3>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="What's your idea?" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-dark" placeholder="Explain the idea in more detail..." rows={4} style={{ resize: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm({ ...form, category: c.id })} style={{
                  padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', border: 'none',
                  background: form.category === c.id ? c.color : '#161b22',
                  color: form.category === c.id ? '#fff' : '#8b949e',
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input-dark" placeholder="ai, automation, UX" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Sharing...' : 'Share Idea'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IdeaDetailModal({ idea, session, onClose, onAnalyze, analyzing }: any) {
  const isAdmin = session?.user?.role === 'admin'
  const ai = idea.ai_analysis
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 520,
        background: '#0d1117', borderLeft: '1px solid #30363d',
        overflow: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: CATEGORIES.find(c => c.id === idea.category)?.color || '#8b949e', background: `${CATEGORIES.find(c => c.id === idea.category)?.color || '#8b949e'}18`, borderRadius: 100, padding: '4px 12px' }}>
            {idea.category}
          </span>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 10 }}>{idea.title}</h2>
        {idea.description && <p style={{ fontSize: 14, color: '#8b949e', lineHeight: 1.7, marginBottom: 20 }}>{idea.description}</p>}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {idea.submitter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar user={idea.submitter} size={28} />
              <span style={{ fontSize: 13, color: '#8b949e' }}>{idea.submitter.full_name}</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: '#484f58' }}>•</span>
          <span style={{ fontSize: 12, color: '#484f58' }}>{new Date(idea.created_at).toLocaleDateString()}</span>
          <span style={{ fontSize: 12, color: '#484f58' }}>•</span>
          <span style={{ fontSize: 12, color: '#4f8ef7' }}>👍 {idea.upvotes} votes</span>
        </div>

        {/* AI Analysis */}
        {!ai ? (
          <button className="btn-secondary" onClick={onAnalyze} disabled={analyzing} style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}>
            {analyzing ? <><Spinner size={14} /> Analyzing...</> : <><Zap size={14} /> Analyze with AI</>}
          </button>
        ) : (
          <div style={{ background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AIBadge label="AI Analysis" />
              <span style={{ fontSize: 11, background: ai.recommendation === 'pursue' ? 'rgba(63,185,80,0.1)' : 'rgba(245,166,35,0.1)', color: ai.recommendation === 'pursue' ? '#3fb950' : '#f5a623', borderRadius: 100, padding: '2px 10px' }}>
                {ai.recommendation?.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Feasibility', value: ai.feasibility_score, color: '#4f8ef7' },
                { label: 'Impact', value: ai.impact_score, color: '#3fb950' },
                { label: 'Effort', value: ai.effort_score, color: '#f5a623' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}/10</div>
                  <div style={{ fontSize: 11, color: '#8b949e' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {ai.narrative && <p style={{ fontSize: 13, color: '#c4b5fd', lineHeight: 1.6 }}>{ai.narrative}</p>}
          </div>
        )}

        {/* Tags */}
        {idea.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {idea.tags.map((t: string) => (
              <span key={t} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

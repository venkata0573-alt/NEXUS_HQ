'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Plus, Save, Trash2, Zap, X } from 'lucide-react'
import { SectionHeader, AIBadge, EmptyState, ProgressBar } from '@/components/ui'
import { TimeDistributionChart } from '@/components/charts/TimeDistributionChart'
import { toast } from 'sonner'

const CATEGORIES = [
  { id: 'deep_work', label: 'Deep Work', color: '#4f8ef7', emoji: '🔵' },
  { id: 'meetings', label: 'Meetings', color: '#3fb950', emoji: '🟢' },
  { id: 'learning', label: 'Learning', color: '#f5a623', emoji: '🟡' },
  { id: 'admin', label: 'Admin/Email', color: '#fb923c', emoji: '🟠' },
  { id: 'break', label: 'Break', color: '#f85149', emoji: '🔴' },
  { id: 'planning', label: 'Planning', color: '#7c6af5', emoji: '🟣' },
]

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7am to 9pm

export default function DailyLogPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [blocks, setBlocks] = useState<any[]>([])
  const [energy, setEnergy] = useState(3)
  const [focus, setFocus] = useState(5)
  const [blockers, setBlockers] = useState('')
  const [wins, setWins] = useState('')
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [editBlock, setEditBlock] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')

  const { data: existingLog, isLoading } = useQuery({
    queryKey: ['daily-log', session?.user?.id, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-logs?date=${selectedDate}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data) {
        setBlocks(data.time_blocks || [])
        setEnergy(data.energy_level || 3)
        setFocus(data.focus_score || 5)
        setBlockers(data.blockers || '')
        setWins(data.wins || '')
        setAiSummary(data.ai_summary || '')
      }
      return data
    },
    enabled: !!session?.user?.id,
  })

  const submitLog = useMutation({
    mutationFn: async () => {
      const totalHours = blocks.reduce((sum, b) => {
        const [sh, sm] = b.start.split(':').map(Number)
        const [eh, em] = b.end.split(':').map(Number)
        return sum + (eh * 60 + em - sh * 60 - sm) / 60
      }, 0)
      const res = await fetch('/api/daily-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: selectedDate, time_blocks: blocks, total_hours: totalHours, energy_level: energy, focus_score: focus, blockers, wins }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['daily-log'] })
      toast.success('Daily log submitted! 🎉')
      if (data.ai_summary) setAiSummary(data.ai_summary)
    },
    onError: () => toast.error('Failed to submit log'),
  })

  const totalHours = blocks.reduce((sum, b) => {
    const [sh, sm] = b.start.split(':').map(Number)
    const [eh, em] = b.end.split(':').map(Number)
    return sum + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  const catTotals = CATEGORIES.map(c => ({
    ...c,
    hours: blocks.filter(b => b.category === c.id).reduce((sum, b) => {
      const [sh, sm] = b.start.split(':').map(Number)
      const [eh, em] = b.end.split(':').map(Number)
      return sum + (eh * 60 + em - sh * 60 - sm) / 60
    }, 0)
  })).filter(c => c.hours > 0)

  return (
    <div>
      <SectionHeader
        title="Daily Time Log"
        sub="Track how you spent your 8 hours today"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-dark" style={{ height: 36, fontSize: 13, width: 160 }} max={today} />
            <button className="btn-primary" onClick={() => submitLog.mutate()} disabled={submitLog.isPending || blocks.length === 0}>
              <Save size={14} /> {submitLog.isPending ? 'Saving...' : 'Submit Log'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main timeline area */}
        <div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#4f8ef7', fontFamily: 'Syne, sans-serif' }}>{totalHours.toFixed(1)}h</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>Total Logged</div>
            </div>
            <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#3fb950', fontFamily: 'Syne, sans-serif' }}>{blocks.length}</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>Time Blocks</div>
            </div>
            <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f5a623', fontFamily: 'Syne, sans-serif' }}>{'⭐'.repeat(energy)}</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>Energy Level</div>
            </div>
            <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#7c6af5', fontFamily: 'Syne, sans-serif' }}>{focus}/10</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>Focus Score</div>
            </div>
          </div>

          {/* Time blocks list */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Time Blocks</div>
              <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowAddBlock(true)}>
                <Plus size={13} /> Add Block
              </button>
            </div>

            {blocks.length === 0 ? (
              <EmptyState icon="⏱" title="No time blocks yet" sub="Add blocks to record how you spent your day" action={
                <button className="btn-primary" onClick={() => setShowAddBlock(true)}><Plus size={14} /> Add First Block</button>
              } />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...blocks].sort((a, b) => a.start.localeCompare(b.start)).map((block, i) => {
                  const cat = CATEGORIES.find(c => c.id === block.category) || CATEGORIES[0]
                  const [sh, sm] = block.start.split(':').map(Number)
                  const [eh, em] = block.end.split(':').map(Number)
                  const hrs = (eh * 60 + em - sh * 60 - sm) / 60
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#161b22', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${cat.color}` }}>
                      <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500 }}>{block.task_name || cat.label}</div>
                        <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{cat.label} • {block.start} – {block.end} • {hrs.toFixed(1)}h</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setEditBlock({ ...block, index: i })}>Edit</button>
                        <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setBlocks(blocks.filter((_, idx) => idx !== i))}>
                          <Trash2 size={13} style={{ color: '#f85149' }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Energy & Focus */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 16 }}>Daily Ratings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: '#8b949e' }}>Energy Level</label>
                  <span style={{ fontSize: 13, color: '#f5a623', fontWeight: 600 }}>{'⭐'.repeat(energy)} {energy}/5</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setEnergy(n)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: n <= energy ? 'rgba(245,166,35,0.2)' : '#161b22',
                      color: n <= energy ? '#f5a623' : '#484f58',
                      transition: 'all 0.15s',
                    }}>{n}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#484f58' }}>Exhausted</span>
                  <span style={{ fontSize: 11, color: '#484f58' }}>Peak energy</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: '#8b949e' }}>Focus Score</label>
                  <span style={{ fontSize: 13, color: '#7c6af5', fontWeight: 600 }}>{focus}/10</span>
                </div>
                <input type="range" min={1} max={10} value={focus} onChange={e => setFocus(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#7c6af5' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#484f58' }}>Distracted</span>
                  <span style={{ fontSize: 11, color: '#484f58' }}>In the zone</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>🚧 Blockers (optional)</label>
                  <textarea value={blockers} onChange={e => setBlockers(e.target.value)} className="input-dark" placeholder="What got in the way?" rows={2} style={{ resize: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>🏆 Wins (optional)</label>
                  <textarea value={wins} onChange={e => setWins(e.target.value)} className="input-dark" placeholder="What went well?" rows={2} style={{ resize: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.25)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AIBadge label="AI Daily Insight" />
              </div>
              <p style={{ fontSize: 13, color: '#c4b5fd', lineHeight: 1.6 }}>{aiSummary}</p>
            </div>
          )}
        </div>

        {/* Sidebar - distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 16 }}>Time Distribution</div>
            {catTotals.length > 0 ? <TimeDistributionChart data={catTotals} /> : (
              <div style={{ textAlign: 'center', color: '#484f58', fontSize: 12, padding: '20px 0' }}>Add blocks to see distribution</div>
            )}
          </div>

          {/* Category guide */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Category Guide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIES.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#8b949e' }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: '#484f58', marginLeft: 'auto' }}>{catTotals.find(t => t.id === c.id)?.hours.toFixed(1) || '0'}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Log Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: `${blocks.length} blocks added`, done: blocks.length >= 1, required: '1+ blocks' },
                { label: `${totalHours.toFixed(1)}h logged`, done: totalHours >= 6, required: '6–9 hours' },
                { label: 'Deep work included', done: blocks.some(b => b.category === 'deep_work'), required: 'required' },
                { label: 'Energy rated', done: energy > 0, required: 'required' },
              ].map(({ label, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{done ? '✅' : '⬜'}</span>
                  <span style={{ fontSize: 12, color: done ? '#3fb950' : '#8b949e' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Block Modal */}
      {(showAddBlock || editBlock) && (
        <BlockModal
          initial={editBlock}
          onSave={(block: { start: string; end: string; category: string; task_name: string; notes: string }) => {
            if (editBlock) {
              const newBlocks = [...blocks]
              newBlocks[editBlock.index] = block
              setBlocks(newBlocks)
            } else {
              setBlocks([...blocks, block])
            }
            setShowAddBlock(false); setEditBlock(null)
          }}
          onClose={() => { setShowAddBlock(false); setEditBlock(null) }}
        />
      )}
    </div>
  )
}

function BlockModal({ initial, onSave, onClose }: any) {
  const [form, setForm] = useState({
    start: initial?.start || '09:00',
    end: initial?.end || '11:00',
    category: initial?.category || 'deep_work',
    task_name: initial?.task_name || '',
    notes: initial?.notes || '',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#e6edf3' }}>{initial ? 'Edit Block' : 'Add Time Block'}</h3>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Start Time</label>
              <input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="input-dark" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>End Time</label>
              <input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="input-dark" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm({ ...form, category: c.id })} style={{
                  padding: '8px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${form.category === c.id ? c.color : '#30363d'}`,
                  background: form.category === c.id ? `${c.color}18` : '#161b22',
                  color: form.category === c.id ? c.color : '#8b949e',
                  textAlign: 'center',
                }}>{c.emoji} {c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Task / Activity Name</label>
            <input value={form.task_name} onChange={e => setForm({ ...form, task_name: e.target.value })} className="input-dark" placeholder="e.g. Payment API integration" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-dark" placeholder="Any additional notes..." rows={2} style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
              if (!form.task_name.trim()) return toast.error('Add a task name')
              if (form.start >= form.end) return toast.error('End time must be after start')
              onSave(form)
            }}>Save Block</button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Calendar, Plus, X, Clock, Users, Zap } from 'lucide-react'
import { SectionHeader, AIBadge, EmptyState, Spinner } from '@/components/ui'
import { toast } from 'sonner'

const MEETING_TYPES = [
  { id: 'monday_planning', label: 'Monday Planning', emoji: '📋', color: '#4f8ef7' },
  { id: 'friday_review', label: 'Friday Review', emoji: '📊', color: '#3fb950' },
  { id: 'ad_hoc', label: 'Ad Hoc', emoji: '💬', color: '#8b949e' },
]

export default function MeetingsPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const isAdmin = session?.user?.role === 'admin'
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const res = await fetch('/api/meetings')
      if (!res.ok) return []
      return res.json()
    },
  })

  const upcoming = meetings.filter((m: any) => new Date(m.scheduled_at) >= new Date() && m.status !== 'cancelled')
  const past = meetings.filter((m: any) => new Date(m.scheduled_at) < new Date() || m.status === 'completed')

  return (
    <div>
      <SectionHeader
        title="Meetings"
        sub="Monday planning & Friday review — 2 meetings per week"
        action={isAdmin && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Schedule Meeting
          </button>
        )}
      />

      {/* Upcoming */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Upcoming</div>
      {upcoming.length === 0 ? (
        <div className="card" style={{ padding: 32, marginBottom: 20 }}>
          <EmptyState icon="📅" title="No upcoming meetings" sub={isAdmin ? "Schedule Monday planning and Friday review meetings" : "Your admin will schedule meetings"}
            action={isAdmin ? <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Schedule</button> : undefined} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {upcoming.map((m: any) => <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Past Meetings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.slice(0, 10).map((m: any) => <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} isPast />)}
          </div>
        </>
      )}

      {showNew && isAdmin && <NewMeetingModal onClose={() => setShowNew(false)} />}
      {selected && <MeetingDetailDrawer meeting={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />}
    </div>
  )
}

function MeetingCard({ meeting, onClick, isPast = false }: any) {
  const type = MEETING_TYPES.find(t => t.id === meeting.type) || MEETING_TYPES[2]
  const date = new Date(meeting.scheduled_at)
  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="card" style={{ padding: '16px 20px', cursor: 'pointer', opacity: isPast ? 0.7 : 1, transition: 'transform 0.15s' }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${type.color}15`, border: `1px solid ${type.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {type.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{meeting.title}</span>
            {isToday && <span style={{ fontSize: 10, background: 'rgba(248,81,73,0.15)', color: '#f85149', borderRadius: 100, padding: '2px 8px', fontWeight: 600 }}>TODAY</span>}
            {meeting.ai_talking_points?.length > 0 && <AIBadge label="AI prepared" />}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} /> {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: 12, color: '#8b949e' }}>{meeting.duration_mins} min</span>
          </div>
        </div>
        <span style={{
          fontSize: 11, borderRadius: 100, padding: '4px 12px',
          background: meeting.status === 'completed' ? 'rgba(63,185,80,0.1)' : meeting.status === 'scheduled' ? 'rgba(79,142,247,0.1)' : 'rgba(139,148,158,0.1)',
          color: meeting.status === 'completed' ? '#3fb950' : meeting.status === 'scheduled' ? '#4f8ef7' : '#8b949e',
        }}>{meeting.status}</span>
      </div>
    </div>
  )
}

function MeetingDetailDrawer({ meeting, onClose, isAdmin }: any) {
  const type = MEETING_TYPES.find(t => t.id === meeting.type) || MEETING_TYPES[2]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 500,
        background: '#0d1117', borderLeft: '1px solid #30363d', overflow: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>{type.emoji}</span>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>{meeting.title}</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: '#8b949e' }}>📅 {new Date(meeting.scheduled_at).toLocaleString()}</span>
          <span style={{ fontSize: 13, color: '#8b949e' }}>⏱ {meeting.duration_mins} min</span>
        </div>

        {/* Agenda */}
        {meeting.agenda?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 10 }}>Agenda</div>
            {meeting.agenda.map((item: any, i: number) => (
              <div key={i} style={{ background: '#161b22', borderRadius: 8, padding: '10px 14px', marginBottom: 6, display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 13, color: '#e6edf3' }}>{item.title}</div>
                  {item.duration_mins && <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{item.duration_mins} min</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Talking points */}
        {meeting.ai_talking_points?.length > 0 && (
          <div style={{ background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ marginBottom: 10 }}><AIBadge label="AI Talking Points" /></div>
            {meeting.ai_talking_points.map((pt: string, i: number) => (
              <div key={i} style={{ fontSize: 13, color: '#c4b5fd', marginBottom: 6 }}>• {pt}</div>
            ))}
          </div>
        )}

        {/* Notes */}
        {meeting.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 8 }}>Meeting Notes</div>
            <div style={{ background: '#161b22', borderRadius: 8, padding: 14, fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{meeting.notes}</div>
          </div>
        )}

        {/* Action items */}
        {meeting.action_items?.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 10 }}>Action Items</div>
            {meeting.action_items.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #21262d' }}>
                <span style={{ fontSize: 13 }}>{item.done ? '✅' : '⬜'}</span>
                <div>
                  <div style={{ fontSize: 13, color: '#e6edf3' }}>{item.task}</div>
                  <div style={{ fontSize: 11, color: '#8b949e' }}>Owner: {item.owner} • Due: {item.due_date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NewMeetingModal({ onClose }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', type: 'monday_planning', scheduled_at: '',
    duration_mins: 60, notes: '',
    agenda: [{ title: 'Welcome & check-in', duration_mins: 5 }, { title: 'Task review', duration_mins: 20 }, { title: 'Planning', duration_mins: 25 }, { title: 'Wrap up', duration_mins: 10 }]
  })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.title || !form.scheduled_at) return toast.error('Title and date required')
    setLoading(true)
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('Meeting scheduled!'); onClose()
    } catch { toast.error('Failed to schedule meeting') }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>Schedule Meeting</h3>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Meeting Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {MEETING_TYPES.map(t => (
                <button key={t.id} onClick={() => {
                  setForm({ ...form, type: t.id, title: t.id === 'monday_planning' ? 'Monday Planning Session' : t.id === 'friday_review' ? 'Friday Review & Analysis' : '' })
                }} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${form.type === t.id ? t.color : '#30363d'}`,
                  background: form.type === t.id ? `${t.color}15` : '#161b22',
                  color: form.type === t.id ? t.color : '#8b949e', textAlign: 'center',
                }}>{t.emoji} {t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="Meeting title" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Date & Time *</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="input-dark" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Duration (minutes)</label>
              <input type="number" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: parseInt(e.target.value) })} className="input-dark" min={15} step={15} />
            </div>
          </div>
          {form.type === 'friday_review' && (
            <div style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c4b5fd', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Zap size={13} /> AI will automatically generate talking points from this week's team data
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

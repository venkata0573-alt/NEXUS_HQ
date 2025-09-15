'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Filter, Search, LayoutGrid, List, X, Calendar, Clock, User } from 'lucide-react'
import { SectionHeader, PriorityBadge, StatusBadge, Avatar, Tag, AIBadge, EmptyState } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#8b949e' },
  { id: 'in_progress', label: 'In Progress', color: '#4f8ef7' },
  { id: 'in_review', label: 'In Review', color: '#f5a623' },
  { id: 'done', label: 'Done', color: '#3fb950' },
  { id: 'blocked', label: 'Blocked', color: '#f85149' },
]

export default function TasksPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const isAdmin = session?.user?.role === 'admin'
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filterAssignee],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (!isAdmin) params.set('assignee', session?.user?.id || '')
      const res = await fetch(`/api/tasks?${params}`)
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) return []
      return res.json()
    },
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task updated') },
    onError: () => toast.error('Failed to update task'),
  })

  const filtered = tasks.filter((t: any) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterAssignee && t.assignee_id !== filterAssignee) return false
    return true
  })

  const memberMap = Object.fromEntries(members.map((m: any) => [m.id, m]))

  return (
    <div>
      <SectionHeader
        title={isAdmin ? 'All Tasks' : 'My Tasks'}
        sub={`${filtered.length} tasks total • ${filtered.filter((t: any) => t.status === 'done').length} completed`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={view === 'kanban' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => setView('kanban')}>
              <LayoutGrid size={13} /> Kanban
            </button>
            <button className={view === 'list' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => setView('list')}>
              <List size={13} /> List
            </button>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setShowNewTask(true)}>
              <Plus size={14} /> New Task
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#484f58' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="input-dark" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input-dark" style={{ width: 130, height: 36, fontSize: 13 }}>
          <option value="">All Priority</option>
          {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && (
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="input-dark" style={{ width: 150, height: 36, fontSize: 13 }}>
            <option value="">All Members</option>
            {members.filter((m: any) => m.role === 'member').map((m: any) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
        {(search || filterPriority || filterAssignee) && (
          <button className="btn-ghost" onClick={() => { setSearch(''); setFilterPriority(''); setFilterAssignee('') }}><X size={13} /> Clear</button>
        )}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {COLUMNS.map(col => {
            const colTasks = filtered.filter((t: any) => t.status === col.id)
            return (
              <div key={col.id} className="kanban-col" style={{ padding: 14 }}>
                {/* Column header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#484f58', background: '#161b22', borderRadius: 100, padding: '2px 8px' }}>{colTasks.length}</span>
                </div>

                {/* Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#484f58', fontSize: 12 }}>No tasks</div>
                  ) : colTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} member={memberMap[task.assignee_id]} onClick={() => setSelectedTask(task)} onStatusChange={(status: string) => updateTask.mutate({ id: task.id, status })} />
                  ))}
                </div>

                {col.id === 'todo' && (
                  <button className="btn-ghost" style={{ width: '100%', marginTop: 8, justifyContent: 'center', fontSize: 12 }} onClick={() => setShowNewTask(true)}>
                    <Plus size={13} /> Add task
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                {['Task', 'Assignee', 'Priority', 'Status', 'Due Date', 'Hours'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#8b949e', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="✅" title="No tasks found" /></td></tr>
              ) : filtered.map((task: any) => {
                const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'done'
                return (
                  <tr key={task.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0d1117')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setSelectedTask(task)}>
                    <td style={{ padding: '12px 14px', color: '#e6edf3', maxWidth: 300 }}>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      {task.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {task.tags.slice(0, 2).map((t: string) => <Tag key={t} label={t} />)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {memberMap[task.assignee_id] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar user={memberMap[task.assignee_id]} size={24} />
                          <span style={{ color: '#8b949e' }}>{memberMap[task.assignee_id].full_name?.split(' ')[0]}</span>
                        </div>
                      ) : <span style={{ color: '#484f58' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}><PriorityBadge priority={task.priority} /></td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={task.status} /></td>
                    <td style={{ padding: '12px 14px', color: isOverdue ? '#f85149' : '#8b949e', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {task.due_date || '—'}
                      {isOverdue && <span style={{ fontSize: 10, marginLeft: 4 }}>OVERDUE</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#8b949e', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {task.actual_hours || 0}/{task.estimated_hours || '?'}h
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && <NewTaskModal members={members} onClose={() => setShowNewTask(false)} session={session} />}

      {/* Task Detail Drawer */}
      {selectedTask && <TaskDetailDrawer task={selectedTask} member={memberMap[selectedTask.assignee_id]} members={members} onClose={() => setSelectedTask(null)} onUpdate={(data: Record<string, unknown>) => { updateTask.mutate({ id: selectedTask.id, ...data }); setSelectedTask(null) }} />}
    </div>
  )
}

function TaskCard({ task, member, onClick, onStatusChange }: any) {
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'done'
  return (
    <div onClick={onClick} style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
      padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <PriorityBadge priority={task.priority} />
        {task.ai_analysis && <AIBadge label={task.ai_analysis.risk_level?.toUpperCase()} />}
      </div>
      <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {task.tags.slice(0, 2).map((t: string) => <Tag key={t} label={t} />)}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {member ? <Avatar user={member} size={20} /> : <span style={{ fontSize: 11, color: '#484f58' }}>Unassigned</span>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {task.estimated_hours && <span style={{ fontSize: 11, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>{task.estimated_hours}h</span>}
          {task.due_date && (
            <span style={{ fontSize: 11, color: isOverdue ? '#f85149' : '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
              {isOverdue ? '⚠ ' : ''}{task.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function NewTaskModal({ members, onClose, session }: any) {
  const qc = useQueryClient()
  const isAdmin = session?.user?.role === 'admin'
  const [form, setForm] = useState({ title: '', description: '', priority: 'P2', assignee_id: isAdmin ? '' : session?.user?.id, due_date: '', estimated_hours: '', tags: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required')
    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null }),
      })
      if (!res.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created!'); onClose()
    } catch { toast.error('Failed to create task') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>New Task</h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="What needs to be done?" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-dark" placeholder="Additional details..." rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-dark">
                {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Assign to</label>
                <select value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })} className="input-dark">
                  <option value="">Unassigned</option>
                  {members.filter((m: any) => m.role === 'member').map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input-dark" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Estimated Hours</label>
              <input type="number" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: e.target.value })} className="input-dark" placeholder="e.g. 4" min="0.5" step="0.5" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input-dark" placeholder="frontend, api, bug" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskDetailDrawer({ task, member, members, onClose, onUpdate }: any) {
  const [form, setForm] = useState({ status: task.status, priority: task.priority, actual_hours: task.actual_hours || 0 })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 480,
        background: '#0d1117', borderLeft: '1px solid #30363d',
        overflow: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <PriorityBadge priority={task.priority} />
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>{task.title}</h2>
        {task.description && <p style={{ fontSize: 14, color: '#8b949e', lineHeight: 1.6, marginBottom: 20 }}>{task.description}</p>}

        {task.ai_analysis && (
          <div style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AIBadge label="AI Risk Assessment" />
            </div>
            <div style={{ fontSize: 13, color: '#c4b5fd' }}>{task.ai_analysis.risk_reason}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 6 }}>STATUS</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-dark" style={{ fontSize: 13 }}>
                {['todo', 'in_progress', 'in_review', 'done', 'blocked'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 6 }}>HOURS SPENT</label>
              <input type="number" value={form.actual_hours} onChange={e => setForm({ ...form, actual_hours: parseFloat(e.target.value) })} className="input-dark" style={{ fontSize: 13 }} min="0" step="0.5" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'ASSIGNEE', value: member?.full_name || 'Unassigned' },
              { label: 'DUE DATE', value: task.due_date || 'Not set' },
              { label: 'ESTIMATED', value: task.estimated_hours ? `${task.estimated_hours}h` : 'Not set' },
              { label: 'CREATED', value: new Date(task.created_at).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #21262d' }}>
                <span style={{ fontSize: 11, color: '#8b949e', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: 13, color: '#e6edf3' }}>{value}</span>
              </div>
            ))}
          </div>

          {task.tags?.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 8 }}>TAGS</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {task.tags.map((t: string) => <Tag key={t} label={t} />)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={() => onUpdate(form)} style={{ flex: 1 }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

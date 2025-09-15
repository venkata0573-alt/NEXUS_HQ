'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Clock, Zap, Users, TrendingUp, AlertTriangle, Plus, Bot } from 'lucide-react'
import { StatCard, Avatar, ScoreRing, BurnoutGauge, SectionHeader, AIBadge, EmptyState } from '@/components/ui'
import { TaskVelocityChart } from '@/components/charts/TaskVelocityChart'
import { TeamRadarChart } from '@/components/charts/TeamRadarChart'
import { TimeDistributionChart } from '@/components/charts/TimeDistributionChart'
import { AIChat } from '@/components/shared/AIChat'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: session } = useSession()

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/overview')
      if (!res.ok) return null
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

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      if (!res.ok) return []
      return res.json()
    },
  })

  const activeTasks = tasks.filter((t: any) => !['done', 'backlog'].includes(t.status)).length
  const dueTodayTasks = tasks.filter((t: any) => t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'done').length
  const overdueTasks = tasks.filter((t: any) => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'done').length

  const avgScore = overview?.avg_score || 0
  const teamBurnout = overview?.avg_burnout || 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="stagger-children">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#e6edf3', marginBottom: 4 }}>
              {greeting}, {(session?.user?.full_name || session?.user?.name || '').split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: 14, color: '#8b949e' }}>
              Here's your team's pulse for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/tasks">
              <button className="btn-secondary" style={{ fontSize: 13 }}>
                <Plus size={14} /> New Task
              </button>
            </Link>
            <Link href="/agents">
              <button className="btn-primary" style={{ fontSize: 13 }}>
                <Bot size={14} /> Run Agent
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Tasks" value={activeTasks} sub={`${overdueTasks} overdue`} icon={<CheckSquare size={18} />} color="#4f8ef7" />
        <StatCard label="Due Today" value={dueTodayTasks} sub="requires attention" icon={<Clock size={18} />} color={dueTodayTasks > 0 ? '#f5a623' : '#3fb950'} />
        <StatCard label="Avg Team Score" value={`${avgScore.toFixed(0)}/100`} sub="this week" icon={<Zap size={18} />} color="#7c6af5" />
        <StatCard label="Team Size" value={members.filter((m: any) => m.role === 'member').length} sub="active members" icon={<Users size={18} />} color="#06d6a0" />
      </div>

      {/* Overdue alert */}
      {overdueTasks > 0 && (
        <div style={{
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} style={{ color: '#f85149', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#fca5a5' }}>
            <strong>{overdueTasks} overdue tasks</strong> need immediate attention.
          </span>
          <Link href="/tasks?filter=overdue" style={{ marginLeft: 'auto', fontSize: 12, color: '#f85149', textDecoration: 'none' }}>View →</Link>
        </div>
      )}

      {/* Team Members Grid */}
      <SectionHeader title="Team Overview" sub="Real-time status for all team members" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {members.filter((m: any) => m.role === 'member').map((member: any) => (
          <MemberCard key={member.id} member={member} tasks={tasks.filter((t: any) => t.assignee_id === member.id)} />
        ))}
        {members.filter((m: any) => m.role === 'member').length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon="👥" title="No team members yet" sub="Team members will appear here after they sign in with Google" />
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Task Velocity</div>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>Assigned vs completed over 6 weeks</div>
          <TaskVelocityChart />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Team Radar</div>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>6-dimension performance comparison</div>
          <TeamRadarChart members={members.filter((m: any) => m.role === 'member')} />
        </div>
      </div>

      {/* Today's Log Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <TodayLogsPanel members={members.filter((m: any) => m.role === 'member')} />
        <UpcomingMeetingsPanel />
      </div>

      {/* AI Chat */}
      <AIChat />
    </div>
  )
}

function MemberCard({ member, tasks }: { member: any; tasks: any[] }) {
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const active = tasks.filter(t => ['in_progress', 'in_review'].includes(t.status)).length
  const overdue = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'done').length

  return (
    <Link href={`/employees/${member.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <Avatar user={member} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: 2 }}>{member.full_name}</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>{member.job_title || 'Team Member'}</div>
            {member.skill_topic && (
              <div style={{ fontSize: 11, color: '#4f8ef7', marginTop: 4 }}>📚 {member.skill_topic}</div>
            )}
          </div>
          <ScoreRing score={member.weekly_score || 72} size={52} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Active', value: active, color: '#4f8ef7' },
            { label: 'Done', value: done, color: '#3fb950' },
            { label: 'Overdue', value: overdue, color: overdue > 0 ? '#f85149' : '#484f58' },
          ].map(s => (
            <div key={s.label} style={{ background: '#161b22', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#484f58', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Burnout */}
        <BurnoutGauge score={member.burnout_score || 2.5} />

        {/* Log status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #21262d' }}>
          <span style={{ fontSize: 11, color: '#8b949e' }}>Today's log</span>
          {member.logged_today ? (
            <span style={{ fontSize: 11, color: '#3fb950', fontWeight: 600 }}>✓ Submitted</span>
          ) : (
            <span style={{ fontSize: 11, color: '#f5a623', fontWeight: 600 }}>⚠ Pending</span>
          )}
        </div>

        {member.streak_days > 0 && (
          <div style={{ fontSize: 11, color: '#f5a623', marginTop: 6 }}>🔥 {member.streak_days}-day streak</div>
        )}
      </div>
    </Link>
  )
}

function TodayLogsPanel({ members }: { members: any[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 16 }}>Today's Daily Logs</div>
      {members.length === 0 ? (
        <EmptyState icon="📋" title="No team members" sub="Add members to see their logs" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar user={m} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#e6edf3' }}>{m.full_name}</div>
                <div style={{ fontSize: 11, color: '#8b949e' }}>
                  {m.logged_today ? `${m.log_hours || 8}h logged • Energy ${m.energy || 3}/5` : 'Not submitted yet'}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px',
                background: m.logged_today ? 'rgba(63,185,80,0.1)' : 'rgba(245,166,35,0.1)',
                color: m.logged_today ? '#3fb950' : '#f5a623',
              }}>
                {m.logged_today ? '✓ Done' : '⏳ Due'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UpcomingMeetingsPanel() {
  const { data: meetings = [] } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: async () => {
      const res = await fetch('/api/meetings?upcoming=true')
      if (!res.ok) return []
      return res.json()
    },
  })

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Upcoming Meetings</div>
        <Link href="/meetings"><span style={{ fontSize: 12, color: '#4f8ef7', cursor: 'pointer' }}>View all →</span></Link>
      </div>
      {meetings.length === 0 ? (
        <EmptyState icon="📅" title="No upcoming meetings" sub="Schedule Monday planning and Friday review meetings" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.slice(0, 3).map((m: any) => (
            <div key={m.id} style={{ background: '#161b22', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500, marginBottom: 4 }}>{m.title}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#8b949e' }}>
                  📅 {new Date(m.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>
                  🕐 {new Date(m.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

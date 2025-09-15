'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Clock, BookOpen, Zap, Plus } from 'lucide-react'
import { StatCard, ScoreRing, BurnoutGauge, SectionHeader, Avatar, AIBadge, EmptyState, ProgressBar } from '@/components/ui'
import { SkillScoreTrendChart, EnergyTrendChart, ProductivityHeatmap } from '@/components/charts'
import Link from 'next/link'

export default function MemberDashboard() {
  const { data: session } = useSession()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?assignee=${session?.user?.id}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session?.user?.id,
  })

  const { data: todayLog } = useQuery({
    queryKey: ['today-log'],
    queryFn: async () => {
      const res = await fetch('/api/daily-logs?date=' + new Date().toISOString().split('T')[0])
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports')
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

  const activeTasks = myTasks.filter((t: any) => t.status === 'in_progress')
  const todayTasks = myTasks.filter((t: any) => t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'done')
  const overdueTasks = myTasks.filter((t: any) => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'done')
  const latestReport = reports[0]
  const prodScore = latestReport?.productivity_score || 0

  return (
    <div className="stagger-children">
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#e6edf3' }}>
              {greeting}, {(session?.user?.full_name || session?.user?.name || '').split(' ')[0]} 👋
            </h1>
            {(session?.user?.streak_days ?? 0) > 0 && (
              <span style={{ fontSize: 14, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, padding: '4px 12px' }}>
                🔥 {session?.user?.streak_days ?? 0}-day streak
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: '#8b949e' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {!todayLog && <span style={{ color: '#f5a623', marginLeft: 12 }}>⚠ Daily log not submitted yet</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!todayLog && (
            <Link href="/daily-log">
              <button className="btn-primary" style={{ fontSize: 13 }}>
                <Plus size={14} /> Submit Today's Log
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ScoreRing score={prodScore} size={90} label="Weekly Score" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <StatCard label="Active Tasks" value={activeTasks.length} sub={`${overdueTasks.length} overdue`} icon={<CheckSquare size={16} />} color={overdueTasks.length > 0 ? '#f85149' : '#4f8ef7'} />
          <StatCard label="Due Today" value={todayTasks.length} sub="tasks" icon={<Clock size={16} />} color={todayTasks.length > 0 ? '#f5a623' : '#3fb950'} />
          <StatCard label="Skill Topic" value={skillTrack?.topic || 'None set'} sub={skillTrack?.topic_approved ? '✓ Approved' : 'Pending approval'} icon={<BookOpen size={16} />} color="#7c6af5" />
        </div>
      </div>

      {/* Log status banner */}
      {todayLog ? (
        <div style={{ background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 13, color: '#86efac' }}>
            <strong>Daily log submitted!</strong> {todayLog.total_hours}h logged • Energy {todayLog.energy_level}/5 • Focus {todayLog.focus_score}/10
          </span>
          {todayLog.ai_summary && (
            <span style={{ marginLeft: 'auto', fontSize: 12 }}><AIBadge label="AI insight available" /></span>
          )}
        </div>
      ) : (
        <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span style={{ fontSize: 13, color: '#fcd34d' }}>
            <strong>Daily log pending</strong> — Submit before 9 PM to maintain your streak
          </span>
          <Link href="/daily-log" style={{ marginLeft: 'auto' }}>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Submit Now →</button>
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Today's tasks */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Today's Tasks</div>
            <Link href="/my-tasks"><span style={{ fontSize: 12, color: '#4f8ef7', cursor: 'pointer' }}>View all →</span></Link>
          </div>
          {myTasks.length === 0 ? (
            <EmptyState icon="✅" title="All clear!" sub="No tasks assigned yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...activeTasks, ...todayTasks].slice(0, 5).map((task: any) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161b22', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.priority === 'P0' ? '#f85149' : task.priority === 'P1' ? '#f5a623' : '#4f8ef7', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#e6edf3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  <span style={{ fontSize: 11, color: task.status === 'in_progress' ? '#4f8ef7' : '#8b949e', flexShrink: 0 }}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skill track */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>This Week's Skill</div>
            <Link href="/skill-track"><span style={{ fontSize: 12, color: '#4f8ef7', cursor: 'pointer' }}>Manage →</span></Link>
          </div>
          {skillTrack ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', marginBottom: 8 }}>{skillTrack.topic}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, borderRadius: 100, padding: '3px 10px', background: skillTrack.topic_approved ? 'rgba(63,185,80,0.1)' : 'rgba(245,166,35,0.1)', color: skillTrack.topic_approved ? '#3fb950' : '#f5a623' }}>
                  {skillTrack.topic_approved ? '✓ Approved' : '⏳ Awaiting approval'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>{skillTrack.learning_hours || 0}h studied this week</div>
              <ProgressBar value={skillTrack.learning_hours || 0} max={10} color="#7c6af5" />
              {skillTrack.resources?.slice(0, 2).map((r: any, i: number) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, textDecoration: 'none' }}>
                  <span style={{ fontSize: 12, color: '#4f8ef7' }}>📎 {r.title}</span>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState icon="📚" title="No skill selected" sub="Choose your learning topic for this week" action={<Link href="/skill-track"><button className="btn-primary" style={{ fontSize: 12 }}>Select Topic</button></Link>} />
          )}
        </div>
      </div>

      {/* Burnout + Weekly report */}
      {latestReport && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 16 }}>Burnout Risk</div>
            <BurnoutGauge score={latestReport.burnout_risk_score || 0} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Latest Report</div>
              <Link href="/test"><span style={{ fontSize: 12, color: '#4f8ef7' }}>View tests →</span></Link>
            </div>
            {latestReport.ai_narrative ? (
              <div>
                <div className="ai-badge" style={{ marginBottom: 10 }}>✦ AI Summary</div>
                <p style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.6 }}>{latestReport.ai_narrative.slice(0, 180)}...</p>
              </div>
            ) : (
              <EmptyState icon="📊" title="No report yet" sub="Reports generate every Friday" />
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Skill Score Trend</div>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12 }}>Weekly test performance</div>
          <SkillScoreTrendChart />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Energy Trend</div>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12 }}>Last 14 days</div>
          <EnergyTrendChart />
        </div>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Productivity Heatmap</div>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>Activity over the past 12 weeks</div>
        <ProductivityHeatmap />
      </div>
    </div>
  )
}

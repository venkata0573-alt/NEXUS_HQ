'use client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, TrendingUp, Award } from 'lucide-react'
import { SectionHeader, Avatar, ScoreRing, BurnoutGauge, EmptyState, ProgressBar } from '@/components/ui'
import { ProductivityHeatmap, EnergyTrendChart } from '@/components/charts'

export default function EmployeesPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['all-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports')
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

  const { data: skillTracks = [] } = useQuery({
    queryKey: ['all-skill-tracks'],
    queryFn: async () => {
      const res = await fetch('/api/skill-tracks/all')
      if (!res.ok) return []
      return res.json()
    },
  })

  const teamMembers = members.filter((m: any) => m.role === 'member')

  // Team averages
  const latestReports = teamMembers.map((m: any) => reports.find((r: any) => r.user_id === m.id)).filter(Boolean)
  const avgScore = latestReports.length ? latestReports.reduce((s: number, r: any) => s + (r?.productivity_score || 0), 0) / latestReports.length : 0
  const avgBurnout = latestReports.length ? latestReports.reduce((s: number, r: any) => s + (r?.burnout_risk_score || 0), 0) / latestReports.length : 0

  return (
    <div>
      <SectionHeader title="Team Members" sub={`${teamMembers.length} active members`} />

      {/* Team summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Team Members', value: teamMembers.length, icon: '👥', color: '#4f8ef7' },
          { label: 'Avg Score', value: `${avgScore.toFixed(0)}/100`, icon: '⚡', color: '#7c6af5' },
          { label: 'Avg Burnout', value: `${avgBurnout.toFixed(1)}/10`, icon: '🌡', color: avgBurnout > 5 ? '#f85149' : '#3fb950' },
          { label: 'Active Tasks', value: tasks.filter((t: any) => t.status === 'in_progress').length, icon: '✅', color: '#3fb950' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {teamMembers.length === 0 ? (
        <div className="card" style={{ padding: 48 }}>
          <EmptyState icon="👥" title="No team members yet" sub="Team members appear here after they sign in with Google for the first time" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {teamMembers.map((member: any) => {
            const memberTasks = tasks.filter((t: any) => t.assignee_id === member.id)
            const memberReport = reports.find((r: any) => r.user_id === member.id)
            const memberTracks = skillTracks.filter((t: any) => t.user_id === member.id)
            const today = new Date().toISOString().split('T')[0]
            const overdue = memberTasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== 'done').length
            const done = memberTasks.filter((t: any) => t.status === 'done').length
            const active = memberTasks.filter((t: any) => t.status === 'in_progress').length

            return (
              <div key={member.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 200px', gap: 24 }}>
                  {/* Left: Profile */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <Avatar user={member} size={48} />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>{member.full_name}</div>
                        <div style={{ fontSize: 12, color: '#8b949e' }}>{member.job_title || 'Team Member'}</div>
                        <div style={{ fontSize: 11, color: '#484f58' }}>{member.email}</div>
                      </div>
                    </div>

                    {member.streak_days > 0 && (
                      <div style={{ fontSize: 12, color: '#f5a623', marginBottom: 8 }}>🔥 {member.streak_days}-day log streak</div>
                    )}
                    {member.skill_topic && (
                      <div style={{ fontSize: 12, color: '#7c6af5', marginBottom: 12 }}>📚 {member.skill_topic}</div>
                    )}

                    {/* Task stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
                  </div>

                  {/* Middle: Charts & report */}
                  <div>
                    {memberReport ? (
                      <div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center' }}>
                          <ScoreRing score={memberReport.productivity_score} size={64} label="Score" />
                          <div style={{ flex: 1 }}>
                            <BurnoutGauge score={memberReport.burnout_risk_score || 0} />
                            <div style={{ marginTop: 10 }}>
                              {[
                                { label: 'Task Velocity', value: memberReport.task_velocity, color: '#4f8ef7' },
                                { label: 'Log Consistency', value: memberReport.consistency_rating, color: '#3fb950' },
                              ].map(s => (
                                <div key={s.label} style={{ marginBottom: 6 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: '#8b949e' }}>{s.label}</span>
                                    <span style={{ fontSize: 11, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value?.toFixed(0)}%</span>
                                  </div>
                                  <ProgressBar value={s.value || 0} color={s.color} height={3} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {memberReport.ai_narrative && (
                          <div style={{ background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#c4b5fd', lineHeight: 1.5 }}>
                            {memberReport.ai_narrative.slice(0, 160)}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#484f58', fontSize: 12 }}>
                        No weekly report yet
                      </div>
                    )}
                  </div>

                  {/* Right: Actions & skill tracks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Link href={`/employees/${member.id}`}>
                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                        View Full Profile
                      </button>
                    </Link>
                    <Link href={`/tasks?assignee=${member.id}`}>
                      <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                        View Tasks
                      </button>
                    </Link>

                    {/* Skill history */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>Skill Track History</div>
                      {memberTracks.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#484f58' }}>No tracks yet</div>
                      ) : memberTracks.slice(0, 3).map((t: any) => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{t.topic}</span>
                          {t.test_score ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: t.test_score >= 80 ? '#3fb950' : t.test_score >= 60 ? '#f5a623' : '#f85149', fontFamily: 'JetBrains Mono, monospace' }}>
                              {t.test_score.toFixed(0)}%
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#484f58' }}>—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

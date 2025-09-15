'use client'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { SectionHeader, ScoreRing, BurnoutGauge, AIBadge, Avatar, EmptyState, Spinner, ProgressBar } from '@/components/ui'
import { SkillScoreTrendChart, TaskVelocityChart } from '@/components/charts'
import { toast } from 'sonner'

export default function ReportsPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const isAdmin = session?.user?.role === 'admin'

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports')
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
    enabled: isAdmin,
  })

  const generate = useMutation({
    mutationFn: async (userId?: string) => {
      const res = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Report generated!') },
    onError: () => toast.error('Failed to generate report'),
  })

  const latestReport = reports[0]
  const teamMembers = members.filter((m: any) => m.role === 'member')

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>

  return (
    <div>
      <SectionHeader
        title={isAdmin ? 'Team Reports' : 'My Performance Reports'}
        sub="AI-generated weekly analysis"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {isAdmin && (
              <button className="btn-primary" onClick={() => generate.mutate(undefined)} disabled={generate.isPending}>
                {generate.isPending ? <><Spinner size={14} /> Generating...</> : <><RefreshCw size={14} /> Generate All Reports</>}
              </button>
            )}
          </div>
        }
      />

      {/* Admin: team comparison */}
      {isAdmin && teamMembers.length > 0 && reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {teamMembers.map((member: any) => {
            const report = reports.find((r: any) => r.user_id === member.id)
            return (
              <div key={member.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Avatar user={member} size={36} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{member.full_name}</div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>{member.job_title || 'Team Member'}</div>
                  </div>
                  {report && (
                    <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: 11 }}
                      onClick={() => generate.mutate(member.id)} disabled={generate.isPending}>
                      <RefreshCw size={11} />
                    </button>
                  )}
                </div>
                {report ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                      <ScoreRing score={report.productivity_score} size={72} label="Score" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Tasks', value: `${report.tasks_completed}/${report.tasks_assigned}`, color: '#4f8ef7' },
                        { label: 'Log Days', value: `${Math.round(report.consistency_rating / 20)}/5`, color: '#3fb950' },
                        { label: 'Skill', value: `${report.skill_growth_index?.toFixed(0) || 0}%`, color: '#7c6af5' },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#8b949e' }}>{s.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <BurnoutGauge score={report.burnout_risk_score} />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => generate.mutate(member.id)} disabled={generate.isPending}>
                      Generate Report
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Latest report detail */}
      {latestReport ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>
            {isAdmin ? 'Latest Reports' : `Week ${latestReport.week_number} Report`}
          </div>
          {(isAdmin ? reports : [latestReport]).slice(0, isAdmin ? 6 : 1).map((report: any) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 48 }}>
          <EmptyState icon="📊" title="No reports yet" sub={isAdmin ? "Generate reports for your team members" : "Reports are generated every Friday"}
            action={isAdmin ? <button className="btn-primary" onClick={() => generate.mutate(undefined)} disabled={generate.isPending}>Generate Report</button> : undefined} />
        </div>
      )}

      {/* Charts */}
      {reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Score Trend</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12 }}>Weekly performance</div>
            <SkillScoreTrendChart data={reports.slice(0, 8).reverse().map((r: any, i: number) => ({ week: `Wk ${r.week_number}`, score: r.productivity_score }))} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Task Velocity</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12 }}>Tasks over time</div>
            <TaskVelocityChart data={reports.slice(0, 6).reverse().map((r: any) => ({ week: `Wk ${r.week_number}`, assigned: r.tasks_assigned, completed: r.tasks_completed }))} />
          </div>
        </div>
      )}
    </div>
  )
}

function ReportCard({ report }: { report: any }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          {report.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Avatar user={report.user} size={28} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{report.user.full_name}</span>
            </div>
          )}
          <div style={{ fontSize: 13, color: '#8b949e' }}>
            Week {report.week_number}, {report.year} • Generated {new Date(report.generated_at).toLocaleDateString()}
          </div>
        </div>
        <ScoreRing score={report.productivity_score} size={64} />
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Task Velocity', value: report.task_velocity?.toFixed(0), suffix: '%', color: '#4f8ef7' },
          { label: 'Consistency', value: report.consistency_rating?.toFixed(0), suffix: '%', color: '#3fb950' },
          { label: 'Skill Score', value: report.skill_growth_index?.toFixed(0), suffix: '%', color: '#7c6af5' },
          { label: 'Avg Energy', value: report.avg_energy_level?.toFixed(1), suffix: '/5', color: '#f5a623' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161b22', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}{s.suffix}</div>
            <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Burnout */}
      <div style={{ marginBottom: 20 }}>
        <BurnoutGauge score={report.burnout_risk_score || 0} />
      </div>

      {/* AI Narrative */}
      {report.ai_narrative && (
        <div style={{ background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}><AIBadge label="AI Analysis" /></div>
          <p style={{ fontSize: 13, color: '#c4b5fd', lineHeight: 1.7 }}>{report.ai_narrative}</p>
        </div>
      )}

      {/* Strengths + Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {report.strengths?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#3fb950', marginBottom: 8 }}>✅ Strengths</div>
            {report.strengths.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>• {s}</div>
            ))}
          </div>
        )}
        {report.improvement_areas?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f5a623', marginBottom: 8 }}>📈 Improve</div>
            {report.improvement_areas.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>• {s}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Play, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { SectionHeader, AIBadge, EmptyState, Spinner } from '@/components/ui'
import { toast } from 'sonner'

const AGENTS = [
  {
    id: 'productivity_monitor',
    name: 'Productivity Monitor',
    desc: 'Analyzes daily logs, task updates, and team activity to generate daily insights',
    schedule: 'Runs daily at 11 PM',
    color: '#4f8ef7',
    emoji: '📊',
    input_label: null,
  },
  {
    id: 'task_assigner',
    name: 'Task Assigner',
    desc: 'Takes your goals as input, breaks them into tasks, and assigns them based on skills and capacity',
    schedule: 'Runs every Monday 7 AM or manually',
    color: '#7c6af5',
    emoji: '📋',
    input_label: "Describe this week's goals",
    input_placeholder: "e.g. Build payment integration, fix login bug, write API docs",
  },
  {
    id: 'skill_evaluator',
    name: 'Skill Evaluator',
    desc: 'Grades written test answers using AI rubrics and generates personalized feedback',
    schedule: 'Triggered after each test submission',
    color: '#3fb950',
    emoji: '🧪',
    input_label: null,
  },
  {
    id: 'pattern_predictor',
    name: 'Pattern Predictor',
    desc: 'Analyzes 4 weeks of data to predict trends, detect burnout risk, and recommend improvements',
    schedule: 'Runs every Sunday at 10 PM',
    color: '#f5a623',
    emoji: '🔮',
    input_label: null,
  },
]

export default function AgentsPage() {
  const qc = useQueryClient()
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [agentInputs, setAgentInputs] = useState<Record<string, string>>({})

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['agent-runs'],
    queryFn: async () => {
      const res = await fetch('/api/agents/runs')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10000,
  })

  const triggerAgent = useMutation({
    mutationFn: async ({ agentType, input }: { agentType: string; input?: string }) => {
      const res = await fetch(`/api/agents/trigger/${agentType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (!res.ok) throw new Error('Trigger failed')
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agent-runs'] })
      toast.success(`${vars.agentType.replace('_', ' ')} agent started!`)
    },
    onError: () => toast.error('Failed to trigger agent'),
  })

  return (
    <div>
      <SectionHeader title="AI Agents" sub="Autonomous agents that analyze your team and take action" />

      {/* Agent cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {AGENTS.map(agent => {
          const recentRun = runs.find((r: any) => r.agent_type === agent.id)
          const isRunning = recentRun?.status === 'running'
          return (
            <div key={agent.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${agent.color}15`, border: `1px solid ${agent.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {agent.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>{agent.desc}</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#484f58', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={11} /> {agent.schedule}
              </div>

              {/* Last run status */}
              {recentRun && (
                <div style={{ background: '#161b22', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8b949e' }}>Last run</span>
                    <span style={{ color: recentRun.status === 'completed' ? '#3fb950' : recentRun.status === 'running' ? '#4f8ef7' : '#f85149' }}>
                      {recentRun.status === 'completed' ? '✓ ' : recentRun.status === 'running' ? '⟳ ' : '✗ '}
                      {recentRun.status}
                    </span>
                  </div>
                  <div style={{ color: '#484f58', marginTop: 2 }}>
                    {new Date(recentRun.created_at).toLocaleString()}
                    {recentRun.duration_ms && ` • ${(recentRun.duration_ms / 1000).toFixed(1)}s`}
                  </div>
                </div>
              )}

              {/* Input for task assigner */}
              {agent.input_label && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>{agent.input_label}</label>
                  <textarea
                    value={agentInputs[agent.id] || ''}
                    onChange={e => setAgentInputs({ ...agentInputs, [agent.id]: e.target.value })}
                    className="input-dark"
                    placeholder={agent.input_placeholder}
                    rows={3}
                    style={{ resize: 'none', fontSize: 12 }}
                  />
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, background: agent.color }}
                onClick={() => triggerAgent.mutate({ agentType: agent.id, input: agentInputs[agent.id] })}
                disabled={triggerAgent.isPending || isRunning}
              >
                {isRunning ? <><Spinner size={14} /> Running...</> : <><Play size={13} /> Run Now</>}
              </button>
            </div>
          )
        })}
      </div>

      {/* Agent runs history */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 14 }}>Agent Run History</div>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size={24} /></div>
      ) : runs.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <EmptyState icon="🤖" title="No agent runs yet" sub="Click 'Run Now' on any agent to start it" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runs.slice(0, 20).map((run: any) => {
            const agent = AGENTS.find(a => a.id === run.agent_type)
            const isExpanded = expandedRun === run.id
            return (
              <div key={run.id} className="card" style={{ overflow: 'hidden' }}>
                <div
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                >
                  <span style={{ fontSize: 16 }}>{agent?.emoji || '🤖'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{agent?.name || run.agent_type}</div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                      {new Date(run.created_at).toLocaleString()} • {run.triggered_by}
                      {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, borderRadius: 100, padding: '3px 10px',
                    background: run.status === 'completed' ? 'rgba(63,185,80,0.1)' : run.status === 'running' ? 'rgba(79,142,247,0.1)' : 'rgba(248,81,73,0.1)',
                    color: run.status === 'completed' ? '#3fb950' : run.status === 'running' ? '#4f8ef7' : '#f85149',
                  }}>{run.status}</span>
                  {isExpanded ? <ChevronUp size={14} style={{ color: '#484f58' }} /> : <ChevronDown size={14} style={{ color: '#484f58' }} />}
                </div>

                {isExpanded && run.output_data && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #21262d' }}>
                    {run.output_data.insights && (
                      <div style={{ background: 'rgba(124,106,245,0.06)', border: '1px solid rgba(124,106,245,0.2)', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                        <AIBadge label="Agent Output" />
                        <p style={{ fontSize: 12, color: '#c4b5fd', marginTop: 8, lineHeight: 1.6 }}>{run.output_data.insights}</p>
                      </div>
                    )}
                    {run.actions_taken?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8 }}>Actions taken:</div>
                        {run.actions_taken.map((a: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: '#3fb950', marginBottom: 4 }}>✓ {a}</div>
                        ))}
                      </div>
                    )}
                    {run.output_data.task_plan && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8 }}>Suggested tasks:</div>
                        <pre style={{ fontSize: 11, color: '#8b949e', background: '#161b22', borderRadius: 6, padding: 10, overflow: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                          {JSON.stringify(run.output_data.task_plan, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

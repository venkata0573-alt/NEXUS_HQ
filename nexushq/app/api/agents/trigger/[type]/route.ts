import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { input } = await req.json().catch(() => ({ input: '' }))
  const agentType = params.type
  const startTime = Date.now()

  // Create run record
  const { data: run } = await supabaseAdmin.from('agent_runs').insert({
    agent_type: agentType, triggered_by: 'manual',
    input_data: { input }, status: 'running',
  }).select().single()

  try {
    let output_data: any = {}
    let actions_taken: string[] = []

    // Gather team data for all agents
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [{ data: users }, { data: tasks }, { data: logs }, { data: reports }] = await Promise.all([
      supabaseAdmin.from('users').select('id,full_name,skill_topic,streak_days').eq('role', 'member').eq('is_active', true),
      supabaseAdmin.from('tasks').select('id,title,status,priority,assignee_id,due_date,estimated_hours').order('updated_at', { ascending: false }).limit(50),
      supabaseAdmin.from('daily_logs').select('user_id,log_date,total_hours,energy_level,focus_score,time_blocks').gte('log_date', weekAgo),
      supabaseAdmin.from('weekly_reports').select('user_id,productivity_score,burnout_risk_score,week_number').order('generated_at', { ascending: false }).limit(12),
    ])

    const memberMap = Object.fromEntries((users || []).map(u => [u.id, u.full_name]))
    const today_logs = (logs || []).filter(l => l.log_date === today)
    const overdue = (tasks || []).filter(t => t.due_date && t.due_date < today && t.status !== 'done')

    // ── AGENT 1: PRODUCTIVITY MONITOR ─────────────────────────────────
    if (agentType === 'productivity_monitor') {
      const teamSummary = (users || []).map(u => {
        const userLogs = (logs || []).filter(l => l.user_id === u.id)
        const todayLog = userLogs.find(l => l.log_date === today)
        const weekLogs = userLogs.filter(l => l.log_date >= weekAgo)
        const avgEnergy = weekLogs.length ? (weekLogs.reduce((s, l) => s + (l.energy_level || 0), 0) / weekLogs.length).toFixed(1) : 'N/A'
        const userTasks = (tasks || []).filter(t => t.assignee_id === u.id)
        const userOverdue = userTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
        return `${u.full_name}: logged_today=${!!todayLog}, energy_avg=${avgEnergy}/5, overdue_tasks=${userOverdue.length}, streak=${u.streak_days}d`
      }).join('\n')

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are an AI productivity monitor for a software team. Analyze this data and provide insights.

Team data for ${today}:
${teamSummary}

Total overdue tasks: ${overdue.length}
Team size: ${(users || []).length}

Provide:
1. A 3-4 sentence "Daily Team Pulse" insight
2. 2-3 specific action items for the admin
3. Any risk flags

Format as plain text, be specific and actionable.`
        }]
      })

      output_data = { insights: (msg.content[0] as any).text, summary: { logged_today: today_logs.length, overdue: overdue.length, team_size: (users || []).length } }
      actions_taken = [
        `Analyzed ${(users || []).length} team members`,
        `Checked ${(tasks || []).length} tasks`,
        today_logs.length < (users || []).length ? `⚠ ${(users || []).length - today_logs.length} member(s) haven't logged today` : '✓ All members logged today',
        overdue.length > 0 ? `⚠ ${overdue.length} overdue tasks flagged` : '✓ No overdue tasks',
      ]

      // Create in-app notification for admin
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id, type: 'agent_completed',
        title: 'Productivity Monitor ran',
        body: output_data.insights.slice(0, 100) + '...',
      })
    }

    // ── AGENT 2: TASK ASSIGNER ─────────────────────────────────────────
    else if (agentType === 'task_assigner') {
      const workload = (users || []).map(u => {
        const userTasks = (tasks || []).filter(t => t.assignee_id === u.id && !['done', 'backlog'].includes(t.status))
        const totalHours = userTasks.reduce((s, t) => s + (t.estimated_hours || 2), 0)
        return `${u.full_name} (skill: ${u.skill_topic || 'general'}): ${userTasks.length} active tasks, ~${totalHours}h workload`
      }).join('\n')

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are a task assignment AI for a software team. Break down these goals into specific tasks and assign them.

Admin's goals: ${input || 'Review team capacity and suggest balanced task assignments for next week'}

Current team workload:
${workload}

Team capacity: ~40h per person per week.

Return a task plan as JSON:
{
  "task_plan": [
    {"title": "...", "assigned_to": "<name>", "estimated_hours": <n>, "priority": "P0|P1|P2|P3", "rationale": "..."},
    ...
  ],
  "summary": "..."
}`
        }]
      })

      try {
        const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(raw)
        output_data = parsed
        actions_taken = [
          `Analyzed goals: "${(input || '').slice(0, 50)}..."`,
          `Generated ${parsed.task_plan?.length || 0} task assignments`,
          `Balanced workload across ${(users || []).length} team members`,
          'Draft ready — review and publish in Tasks',
        ]
      } catch {
        output_data = { insights: (msg.content[0] as any).text }
        actions_taken = ['Generated task suggestions (review output below)']
      }
    }

    // ── AGENT 3: SKILL EVALUATOR ───────────────────────────────────────
    else if (agentType === 'skill_evaluator') {
      const { data: pendingTests } = await supabaseAdmin
        .from('weekly_tests').select('id,topic,user_id').eq('status', 'submitted').limit(5)

      if (!pendingTests || pendingTests.length === 0) {
        output_data = { message: 'No pending tests to evaluate' }
        actions_taken = ['Checked for pending tests — none found']
      } else {
        output_data = { pending: pendingTests.length, message: `${pendingTests.length} test(s) queued for grading` }
        actions_taken = [`Found ${pendingTests.length} submitted test(s)`, 'Grading will process each test individually via /api/tests/[id]/submit']
      }
    }

    // ── AGENT 4: PATTERN PREDICTOR ─────────────────────────────────────
    else if (agentType === 'pattern_predictor') {
      const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
      const { data: historicalLogs } = await supabaseAdmin
        .from('daily_logs').select('user_id,log_date,energy_level,focus_score,total_hours').gte('log_date', fourWeeksAgo)

      const patterns = (users || []).map(u => {
        const uLogs = (historicalLogs || []).filter(l => l.user_id === u.id).sort((a, b) => a.log_date.localeCompare(b.log_date))
        const avgEnergy = uLogs.length ? (uLogs.reduce((s, l) => s + (l.energy_level || 0), 0) / uLogs.length).toFixed(1) : 'N/A'
        const recentEnergy = uLogs.slice(-7).length ? (uLogs.slice(-7).reduce((s, l) => s + (l.energy_level || 0), 0) / uLogs.slice(-7).length).toFixed(1) : 'N/A'
        const uReports = (reports || []).filter(r => r.user_id === u.id).slice(0, 4)
        const scores = uReports.map(r => r.productivity_score?.toFixed(0)).join(', ')
        return `${u.full_name}: 4-week avg energy=${avgEnergy}, recent 7-day energy=${recentEnergy}, recent scores=[${scores}]`
      }).join('\n')

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 700,
        messages: [{
          role: 'user',
          content: `Analyze these 4-week productivity patterns and predict next week's performance.

${patterns}

Provide:
1. Key trends for each person (improving/declining/stable)
2. Burnout risk assessment
3. Specific predictions for next week
4. 3-5 actionable recommendations for the admin

Be data-specific. Flag anyone whose recent energy is significantly lower than their 4-week average.`
        }]
      })

      output_data = {
        insights: (msg.content[0] as any).text,
        period: `${fourWeeksAgo} to ${today}`,
        members_analyzed: (users || []).length,
      }
      actions_taken = [
        `Analyzed ${(historicalLogs || []).length} daily log entries`,
        `Reviewed ${(reports || []).length} weekly reports`,
        `Pattern analysis complete for ${(users || []).length} members`,
        'Predictions ready for Monday planning meeting',
      ]
    }

    // Update run record to completed
    const duration = Date.now() - startTime
    await supabaseAdmin.from('agent_runs').update({
      output_data, actions_taken, status: 'completed', duration_ms: duration,
    }).eq('id', run?.id)

    return NextResponse.json({ success: true, output_data, actions_taken, duration_ms: duration })

  } catch (err: any) {
    await supabaseAdmin.from('agent_runs').update({
      status: 'failed', output_data: { error: err.message }, duration_ms: Date.now() - startTime,
    }).eq('id', run?.id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

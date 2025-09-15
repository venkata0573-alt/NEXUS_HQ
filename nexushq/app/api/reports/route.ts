import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || (session.user.role !== 'admin' ? session.user.id : undefined)

  let query = supabaseAdmin.from('weekly_reports')
    .select('*, user:users(id,full_name,avatar_url)')
    .order('generated_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query.limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  const targetId = user_id || session.user.id

  const now = new Date()
  const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)

  // Gather data for the user this week
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [{ data: tasks }, { data: logs }, { data: test }, { data: user }] = await Promise.all([
    supabaseAdmin.from('tasks').select('status,priority,estimated_hours,actual_hours,due_date').eq('assignee_id', targetId),
    supabaseAdmin.from('daily_logs').select('total_hours,energy_level,focus_score').eq('user_id', targetId).gte('log_date', weekStartStr),
    supabaseAdmin.from('weekly_tests').select('total_score,topic').eq('user_id', targetId).order('created_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('users').select('full_name').eq('id', targetId).single(),
  ])

  const tasksDone = (tasks || []).filter(t => t.status === 'done').length
  const tasksTotal = (tasks || []).length
  const tasksOverdue = (tasks || []).filter(t => t.due_date && t.due_date < now.toISOString().split('T')[0] && t.status !== 'done').length
  const avgEnergy = logs?.length ? (logs.reduce((s, l) => s + (l.energy_level || 0), 0) / logs.length) : 0
  const avgFocus = logs?.length ? (logs.reduce((s, l) => s + (l.focus_score || 0), 0) / logs.length) : 0
  const totalHours = logs?.reduce((s, l) => s + (l.total_hours || 0), 0) || 0
  const logDays = logs?.length || 0

  // Score calculation
  const taskVelocity = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0
  const logConsistency = (logDays / 5) * 100
  const skillScore = (test as any)?.total_score || 0
  const productivityScore = (taskVelocity * 0.35) + (logConsistency * 0.25) + (avgFocus * 10 * 0.20) + (skillScore * 0.20)
  const burnoutRisk = Math.max(0, Math.min(10, ((5 - avgEnergy) * 1.5) + (tasksOverdue * 0.5) + ((5 - logDays) * 0.3)))

  // AI narrative
  let ai_narrative = ''
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Write a weekly performance report narrative for ${(user as any)?.full_name}:
- Tasks: ${tasksDone}/${tasksTotal} completed, ${tasksOverdue} overdue
- Daily logs: ${logDays}/5 days submitted, avg ${totalHours.toFixed(1)}h/day
- Energy: ${avgEnergy.toFixed(1)}/5 avg, Focus: ${avgFocus.toFixed(1)}/10 avg
- Skill test: ${(test as any)?.topic || 'none'} — ${skillScore?.toFixed(0) || 'N/A'}%
- Overall score: ${productivityScore.toFixed(0)}/100

Write 3-4 sentences covering: overall performance, strengths, one area to improve. Be specific, encouraging, and data-driven.`
      }]
    })
    ai_narrative = (msg.content[0] as any).text
  } catch { ai_narrative = `${(user as any)?.full_name} completed ${tasksDone} of ${tasksTotal} tasks this week with a productivity score of ${productivityScore.toFixed(0)}/100.` }

  const strengths = tasksDone > taskVelocity * 0.8 ? ['Strong task completion rate'] : []
  if (logDays >= 4) strengths.push('Consistent daily logging habit')
  if (avgEnergy >= 3.5) strengths.push('Maintaining good energy levels')

  const improvements = tasksOverdue > 0 ? [`Reduce overdue tasks (${tasksOverdue} pending)`] : []
  if (logDays < 4) improvements.push('Improve daily log consistency')
  if (burnoutRisk > 4) improvements.push('Watch workload — burnout risk detected')

  const { data, error } = await supabaseAdmin.from('weekly_reports').upsert({
    user_id: targetId, week_number: weekNumber, year: now.getFullYear(),
    productivity_score: productivityScore, skill_growth_index: skillScore,
    consistency_rating: logConsistency, task_velocity: taskVelocity,
    tasks_assigned: tasksTotal, tasks_completed: tasksDone, tasks_overdue: tasksOverdue,
    avg_energy_level: avgEnergy, total_logged_hours: totalHours,
    strengths, improvement_areas: improvements,
    recommendations: ['Set clear daily priorities', 'Block deep work time', 'Review overdue tasks first'],
    ai_narrative, burnout_risk_score: burnoutRisk,
    generated_at: now.toISOString(),
  }, { onConflict: 'user_id,week_number,year' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the member
  await supabaseAdmin.from('notifications').insert({
    user_id: targetId, type: 'weekly_report',
    title: `Week ${weekNumber} report ready`,
    body: `Your productivity score: ${productivityScore.toFixed(0)}/100`,
  })

  return NextResponse.json(data, { status: 201 })
}

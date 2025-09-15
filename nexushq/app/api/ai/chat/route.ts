import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history = [] } = await req.json()

  // Gather team context
  const [{ data: tasks }, { data: users }, { data: logs }, { data: reports }] = await Promise.all([
    supabaseAdmin.from('tasks').select('title,status,priority,assignee_id,due_date').limit(50),
    supabaseAdmin.from('users').select('id,full_name,role,skill_topic,streak_days').eq('is_active', true),
    supabaseAdmin.from('daily_logs').select('user_id,log_date,total_hours,energy_level,focus_score').order('log_date', { ascending: false }).limit(21),
    supabaseAdmin.from('weekly_reports').select('user_id,week_number,productivity_score,burnout_risk_score').order('generated_at', { ascending: false }).limit(9),
  ])

  const today = new Date().toISOString().split('T')[0]
  const overdue = (tasks || []).filter(t => t.due_date && t.due_date < today && t.status !== 'done')
  const memberMap = Object.fromEntries((users || []).map(u => [u.id, u.full_name]))

  const context = `
Team (${(users || []).filter(u => u.role === 'member').length} members):
${(users || []).filter(u => u.role === 'member').map(u => `- ${u.full_name}: skill="${u.skill_topic || 'none'}", streak=${u.streak_days}d`).join('\n')}

Tasks (${(tasks || []).length} total):
- Active: ${(tasks || []).filter(t => t.status === 'in_progress').length}
- Done: ${(tasks || []).filter(t => t.status === 'done').length}
- Overdue: ${overdue.length} tasks${overdue.length > 0 ? ' (' + overdue.slice(0, 3).map(t => t.title).join(', ') + ')' : ''}
- Blocked: ${(tasks || []).filter(t => t.status === 'blocked').length}

Recent energy levels (last 7 logs avg): ${(logs || []).slice(0, 7).reduce((s, l) => s + (l.energy_level || 0), 0) / Math.max(1, Math.min(7, (logs || []).length))}

Weekly reports: ${(reports || []).map(r => `${memberMap[r.user_id] || 'Unknown'}: score=${r.productivity_score?.toFixed(0)}, burnout=${r.burnout_risk_score?.toFixed(1)}`).join('; ')}
`

  const messages = [
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message }
  ]

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You are NexusHQ AI, an intelligent assistant for a software engineering team's productivity platform. You have access to real-time team data and help the ${session.user.role === 'admin' ? 'admin' : 'team member'} make better decisions.

Current team data:
${context}

Be concise, specific, and actionable. Use data to back up insights. Address the user as ${session.user.full_name?.split(' ')[0]}.`,
    messages,
  })

  return NextResponse.json({ reply: (msg.content[0] as any).text })
}

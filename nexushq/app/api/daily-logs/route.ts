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
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const userId = searchParams.get('user_id') || session.user.id

  const { data, error } = await supabaseAdmin
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || null)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { log_date, time_blocks, total_hours, energy_level, focus_score, blockers, wins } = body

  // Generate AI summary
  let ai_summary = ''
  try {
    const blockSummary = time_blocks.map((b: any) => `${b.start}-${b.end}: ${b.task_name} (${b.category})`).join(', ')
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Analyze this daily work log for ${session.user.full_name}:
Time blocks: ${blockSummary}
Total hours: ${total_hours}h
Energy level: ${energy_level}/5
Focus score: ${focus_score}/10
Blockers: ${blockers || 'none'}
Wins: ${wins || 'none'}

Write a 2-sentence insight about their productivity patterns and one actionable recommendation. Be specific and encouraging.`
      }]
    })
    ai_summary = (msg.content[0] as any).text
  } catch (e) {
    console.error('AI summary failed:', e)
  }

  // Update streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const { data: prevLog } = await supabaseAdmin.from('daily_logs').select('id').eq('user_id', session.user.id).eq('log_date', yesterdayStr).single()

  const { data: user } = await supabaseAdmin.from('users').select('streak_days').eq('id', session.user.id).single()
  const newStreak = prevLog ? (user?.streak_days || 0) + 1 : 1
  await supabaseAdmin.from('users').update({ streak_days: newStreak }).eq('id', session.user.id)

  const { data, error } = await supabaseAdmin
    .from('daily_logs')
    .upsert({ user_id: session.user.id, log_date, time_blocks, total_hours, energy_level, focus_score, blockers, wins, ai_summary, submitted_at: new Date().toISOString() }, { onConflict: 'user_id,log_date' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notification for admin
  const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin')
  if (admins) {
    await supabaseAdmin.from('notifications').insert(admins.map(a => ({
      user_id: a.id, type: 'log_submitted',
      title: `${session.user.full_name} submitted daily log`,
      body: `${total_hours}h logged • Energy ${energy_level}/5`,
    })))
  }

  return NextResponse.json(data, { status: 201 })
}

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
  const upcoming = searchParams.get('upcoming')

  let query = supabaseAdmin.from('meetings').select('*').order('scheduled_at', { ascending: true })
  if (upcoming) query = query.gte('scheduled_at', new Date().toISOString()).limit(5)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Auto-generate AI talking points for Friday review
  let ai_talking_points: string[] = []
  if (body.type === 'friday_review') {
    try {
      const { data: reports } = await supabaseAdmin
        .from('weekly_reports').select('*, user:users(full_name)')
        .order('generated_at', { ascending: false }).limit(3)

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Generate 5 concise talking points for a Friday team review meeting based on this week's data:
${JSON.stringify(reports?.map(r => ({ name: (r as any).user?.full_name, score: r.productivity_score, burnout: r.burnout_risk_score })))}
Return as JSON array of strings: ["point1", "point2", ...]`
        }]
      })
      const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      ai_talking_points = JSON.parse(raw)
    } catch { ai_talking_points = ['Review this week\'s task completions', 'Discuss blockers and challenges', 'Skill test results review', 'Plan next week priorities', 'Team wellbeing check-in'] }
  }

  const { data, error } = await supabaseAdmin.from('meetings').insert({
    ...body, created_by: session.user.id, ai_talking_points,
    agenda: body.agenda || [], action_items: [], status: 'scheduled',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify all team members
  const { data: members } = await supabaseAdmin.from('users').select('id').eq('is_active', true).neq('id', session.user.id)
  if (members) {
    await supabaseAdmin.from('notifications').insert(members.map((m: any) => ({
      user_id: m.id, type: 'meeting_scheduled',
      title: `Meeting scheduled: ${body.title}`,
      body: `${new Date(body.scheduled_at).toLocaleString()}`,
    })))
  }

  return NextResponse.json(data, { status: 201 })
}

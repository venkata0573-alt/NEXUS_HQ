import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('skill_tracks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

  const now = new Date()
  const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)

  // Auto-generate learning resources
  let resources: any[] = []
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Generate 6 real learning resources for "${topic}" for a software engineer. Return ONLY JSON array, no markdown:
[
  {"title": "...", "url": "https://...", "type": "article|video|docs|exercise", "description": "..."},
  ...
]
Include mix of official docs, tutorials, and hands-on exercises. Use real URLs from official sources.`
      }]
    })
    const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    resources = JSON.parse(raw)
  } catch {
    resources = [
      { title: `${topic} Official Documentation`, url: 'https://docs.example.com', type: 'docs', description: 'Official reference' },
      { title: `Learn ${topic} - Tutorial`, url: 'https://tutorial.example.com', type: 'article', description: 'Beginner guide' },
    ]
  }

  // Auto-approve if admin requested, else pending
  const isAdmin = session.user.role === 'admin'

  const { data, error } = await supabaseAdmin.from('skill_tracks').insert({
    user_id: session.user.id,
    week_number: weekNumber,
    year: now.getFullYear(),
    topic,
    topic_approved: isAdmin,
    resources,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update user skill topic
  await supabaseAdmin.from('users').update({ skill_topic: topic }).eq('id', session.user.id)

  // Notify admin if member submitted
  if (!isAdmin) {
    const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin')
    if (admins) {
      await supabaseAdmin.from('notifications').insert(admins.map((a: any) => ({
        user_id: a.id, type: 'skill_approval',
        title: `${session.user.full_name} selected skill topic`,
        body: `"${topic}" — pending your approval`,
      })))
    }
  }

  return NextResponse.json(data, { status: 201 })
}

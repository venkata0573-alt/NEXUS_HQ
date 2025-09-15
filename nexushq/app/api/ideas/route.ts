import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('ideas')
    .select('*, submitter:users!submitted_by(id,full_name,avatar_url)')
    .order('upvotes', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('ideas').insert({
    ...body,
    submitted_by: session.user.id,
    upvotes: 0,
    voters: [],
  }).select('*, submitter:users!submitted_by(id,full_name,avatar_url)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify team
  const { data: users } = await supabaseAdmin.from('users').select('id').neq('id', session.user.id)
  if (users) {
    await supabaseAdmin.from('notifications').insert(users.map((u: any) => ({
      user_id: u.id, type: 'new_idea',
      title: `${session.user.full_name} shared a new idea`,
      body: body.title,
    })))
  }

  return NextResponse.json(data, { status: 201 })
}

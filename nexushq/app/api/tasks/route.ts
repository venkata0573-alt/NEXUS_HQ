import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assignee = searchParams.get('assignee')
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('tasks')
    .select(`*, assignee:users!assignee_id(id,full_name,avatar_url,email)`)
    .order('created_at', { ascending: false })

  if (session.user.role !== 'admin' || assignee) {
    query = query.eq('assignee_id', assignee || session.user.id)
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('tasks').insert({
    ...body,
    assigned_by: session.user.id,
    assignee_id: body.assignee_id || session.user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

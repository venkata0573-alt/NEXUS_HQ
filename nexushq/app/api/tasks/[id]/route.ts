import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('tasks').select(`*, assignee:users!assignee_id(id,full_name,avatar_url)`).eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, actual_hours, priority, description, due_date, assignee_id, tags } = body

  const updateData: any = { updated_at: new Date().toISOString() }
  if (status !== undefined) {
    updateData.status = status
    if (status === 'done') updateData.completed_at = new Date().toISOString()
  }
  if (actual_hours !== undefined) updateData.actual_hours = actual_hours
  if (priority !== undefined) updateData.priority = priority
  if (description !== undefined) updateData.description = description
  if (due_date !== undefined) updateData.due_date = due_date
  if (assignee_id !== undefined && session.user.role === 'admin') updateData.assignee_id = assignee_id
  if (tags !== undefined) updateData.tags = tags

  const { data, error } = await supabaseAdmin.from('tasks').update(updateData).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

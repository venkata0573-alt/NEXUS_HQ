import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/ideas/[id]/vote
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: idea } = await supabaseAdmin.from('ideas').select('upvotes,voters').eq('id', params.id).single()
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const voters = idea.voters || []
  if (voters.includes(session.user.id)) return NextResponse.json({ error: 'Already voted' }, { status: 400 })

  const { data } = await supabaseAdmin.from('ideas')
    .update({ upvotes: idea.upvotes + 1, voters: [...voters, session.user.id] })
    .eq('id', params.id).select().single()

  return NextResponse.json(data)
}

// DELETE /api/ideas/[id]/vote
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: idea } = await supabaseAdmin.from('ideas').select('upvotes,voters').eq('id', params.id).single()
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const voters = (idea.voters || []).filter((v: string) => v !== session.user.id)
  const { data } = await supabaseAdmin.from('ideas')
    .update({ upvotes: Math.max(0, idea.upvotes - 1), voters })
    .eq('id', params.id).select().single()

  return NextResponse.json(data)
}

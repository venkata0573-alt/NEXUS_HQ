import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { runAutoExamAgent } from '@/lib/agents/autoExamAgent'

export async function PUT(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the skill track + member info
  const { data: track } = await supabaseAdmin
    .from('skill_tracks')
    .select('*, user:users(id, full_name, role)')
    .eq('id', params.id)
    .single()

  if (!track) return NextResponse.json({ error: 'Skill track not found' }, { status: 404 })

  // Mark as approved
  const { data, error } = await supabaseAdmin
    .from('skill_tracks')
    .update({ topic_approved: true })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const member = track.user as any

  // Notify member that topic is approved
  await supabaseAdmin.from('notifications').insert({
    user_id: track.user_id,
    type: 'skill_approved',
    title: `Topic approved: ${track.topic}`,
    body: `Your "${track.topic}" skill topic is approved. Generating your 50-question exam now...`,
    action_url: '/test',
  })

  // Fire the auto-exam agent asynchronously (don't await — return fast)
  runAutoExamAgent({
    skillTrackId: params.id,
    userId: track.user_id,
    topic: track.topic,
    userRole: member?.role || 'member',
    userName: member?.full_name || 'Team member',
  }).then(result => {
    if (!result.success) {
      console.error(`Auto-exam agent failed for topic "${track.topic}":`, result.error)
    }
  })

  return NextResponse.json({
    ...data,
    exam_generation: 'started',
    message: `Topic approved. 50-question exam is being generated for ${member?.full_name}.`,
  })
}

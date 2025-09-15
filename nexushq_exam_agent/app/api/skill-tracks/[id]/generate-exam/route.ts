import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { runAutoExamAgent } from '@/lib/agents/autoExamAgent'

// POST /api/skill-tracks/[id]/generate-exam
// Manually triggers exam generation for a specific skill track
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the track — members can trigger for their own tracks, admins for anyone
  const { data: track, error: trackError } = await supabaseAdmin
    .from('skill_tracks')
    .select('*, user:users(id, full_name, role)')
    .eq('id', params.id)
    .single()

  if (trackError || !track) {
    return NextResponse.json({ error: 'Skill track not found' }, { status: 404 })
  }

  // Members can only generate for themselves
  if (session.user.role !== 'admin' && track.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Must be approved before exam can be generated
  if (!track.topic_approved) {
    return NextResponse.json({
      error: 'Topic not yet approved',
      message: 'Admin must approve this topic before the exam can be generated.',
    }, { status: 400 })
  }

  // Check if exam already exists
  const { data: existingTest } = await supabaseAdmin
    .from('weekly_tests')
    .select('id, status, created_at')
    .eq('skill_track_id', params.id)
    .single()

  if (existingTest) {
    return NextResponse.json({
      already_exists: true,
      test_id: existingTest.id,
      test_status: existingTest.status,
      message: 'Exam already exists for this skill track.',
    })
  }

  const member = track.user as any

  // Trigger async exam generation
  runAutoExamAgent({
    skillTrackId: params.id,
    userId: track.user_id,
    topic: track.topic,
    userRole: member?.role || 'member',
    userName: member?.full_name || 'Team member',
  }).then(result => {
    if (!result.success) {
      console.error(`Manual exam generation failed for "${track.topic}":`, result.error)
    }
  })

  return NextResponse.json({
    success: true,
    topic: track.topic,
    user: member?.full_name,
    message: `Generating 50-question exam on "${track.topic}" — this takes about 30-60 seconds.`,
    check_status: `/api/skill-tracks/${params.id}/exam-status`,
  })
}

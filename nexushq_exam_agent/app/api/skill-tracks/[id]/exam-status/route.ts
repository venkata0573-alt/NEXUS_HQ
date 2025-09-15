import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/skill-tracks/[id]/exam-status
// Poll this to check if the auto-exam agent has finished
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: track } = await supabaseAdmin
    .from('skill_tracks')
    .select('id, topic, topic_approved, user_id')
    .eq('id', params.id)
    .single()

  if (!track) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.user.role !== 'admin' && track.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if test exists
  const { data: test } = await supabaseAdmin
    .from('weekly_tests')
    .select('id, status, created_at, questions')
    .eq('skill_track_id', params.id)
    .single()

  // Check latest agent run for this track
  const { data: agentRun } = await supabaseAdmin
    .from('agent_runs')
    .select('id, status, actions_taken, duration_ms, created_at, output_data')
    .eq('agent_type', 'skill_evaluator')
    .contains('input_data', { skill_track_id: params.id })
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    skill_track_id: params.id,
    topic: track.topic,
    topic_approved: track.topic_approved,
    exam: test ? {
      ready: true,
      test_id: test.id,
      status: test.status,
      question_count: (test.questions as any[])?.length || 0,
      created_at: test.created_at,
    } : {
      ready: false,
    },
    agent_run: agentRun ? {
      status: agentRun.status,
      actions_taken: agentRun.actions_taken,
      duration_ms: agentRun.duration_ms,
      started_at: agentRun.created_at,
    } : null,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: track } = await supabaseAdmin.from('skill_tracks').select('user_id,topic').eq('id', params.id).single()

  const { data, error } = await supabaseAdmin
    .from('skill_tracks').update({ topic_approved: true }).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the member
  if (track) {
    await supabaseAdmin.from('notifications').insert({
      user_id: track.user_id, type: 'skill_approved',
      title: 'Skill topic approved!',
      body: `Your topic "${track.topic}" has been approved. Your test will be available on Friday.`,
    })
  }

  return NextResponse.json(data)
}

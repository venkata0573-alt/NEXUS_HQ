import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = session.user.role === 'admin'
    ? supabaseAdmin.from('skill_tracks').select('*, user:users(id,full_name)').order('created_at', { ascending: false })
    : supabaseAdmin.from('skill_tracks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

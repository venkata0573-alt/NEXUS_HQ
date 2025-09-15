import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json()
  await supabaseAdmin.from('weekly_tests')
    .update({ answers, status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', params.id).eq('user_id', session.user.id)

  return NextResponse.json({ saved: true })
}

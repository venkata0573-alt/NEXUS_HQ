import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: idea } = await supabaseAdmin.from('ideas').select('*').eq('id', params.id).single()
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyze this team idea from a product/business perspective. Return ONLY valid JSON, no markdown.

Title: ${idea.title}
Description: ${idea.description || 'No description'}
Category: ${idea.category}

Return:
{
  "feasibility_score": <1-10>,
  "impact_score": <1-10>,
  "effort_score": <1-10, where 1=very high effort, 10=very low effort>,
  "time_to_implement": "<days|weeks|months>",
  "potential_risks": ["<risk1>", "<risk2>"],
  "strengths": ["<strength1>", "<strength2>"],
  "narrative": "<2 paragraphs of analysis>",
  "recommendation": "<pursue|refine|deprioritize|park>"
}`
      }]
    })

    const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const analysis = JSON.parse(raw)

    const { data: updated } = await supabaseAdmin.from('ideas')
      .update({ ai_analysis: analysis, ai_analyzed_at: new Date().toISOString() })
      .eq('id', params.id).select().single()

    return NextResponse.json({ ai_analysis: analysis, idea: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Analysis failed: ' + e.message }, { status: 500 })
  }
}

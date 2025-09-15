import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, skill_track_id } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Generate a 50-question test on "${topic}" for a software engineering professional.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "number": 1,
      "question": "question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_answer": "A",
      "difficulty": "easy",
      "topic_area": "subtopic"
    }
  ]
}

Include exactly:
- 25 MCQ questions (type: "mcq") with 4 options each - numbers 1-25
- 15 short written questions (type: "short_written") with expected_answer_guide and rubric: {max_score: 10, criteria: ["accuracy","completeness","clarity"]} - numbers 26-40  
- 10 scenario questions (type: "scenario") with expected_answer_guide and rubric: {max_score: 25, criteria: ["technical_accuracy","practical_application","problem_solving"]} - numbers 41-50

Difficulty distribution for MCQ: 8 easy, 12 medium, 5 hard.
Make questions practical, relevant to real engineering work, and progressively harder.`
      }]
    })

    const raw = (msg.content[0] as any).text
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    const { data, error } = await supabaseAdmin.from('weekly_tests').insert({
      user_id: session.user.id,
      skill_track_id,
      topic,
      questions: parsed.questions,
      status: 'not_started',
      time_limit_mins: 60,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    console.error('Test generation error:', e)
    return NextResponse.json({ error: 'Failed to generate test: ' + e.message }, { status: 500 })
  }
}

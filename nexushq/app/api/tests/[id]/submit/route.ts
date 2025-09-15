import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json()

  const { data: test, error } = await supabaseAdmin
    .from('weekly_tests').select('*').eq('id', params.id).single()
  if (error || !test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

  const questions = test.questions || []

  // Score MCQ instantly
  const mcqs = questions.filter((q: any) => q.type === 'mcq')
  const mcqCorrect = mcqs.filter((q: any) => answers[q.id] === q.correct_answer).length
  const mcqScore = mcqs.length > 0 ? (mcqCorrect / mcqs.length) * 100 : 0

  // Grade written + scenario with Claude
  const writtenQs = questions.filter((q: any) => q.type === 'short_written' || q.type === 'scenario')
  const ai_evaluation: Record<string, any> = {}
  let writtenTotal = 0
  let writtenMax = 0

  // Grade written questions in batches
  for (const q of writtenQs) {
    const userAnswer = answers[q.id] || ''
    const maxScore = q.rubric?.max_score || (q.type === 'scenario' ? 25 : 10)
    writtenMax += maxScore

    if (!userAnswer.trim()) {
      ai_evaluation[q.id] = { score: 0, feedback: 'No answer provided.', correct_answer_explanation: q.expected_answer_guide || '' }
      continue
    }

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Grade this answer. Return ONLY JSON, no markdown.

Question: ${q.question}
Expected answer guide: ${q.expected_answer_guide || 'Use your expertise'}
Rubric criteria: ${JSON.stringify(q.rubric?.criteria || [])}
Max score: ${maxScore}
Student answer: ${userAnswer}

Return: {"score": <number 0-${maxScore}>, "feedback": "<1-2 sentences>", "correct_answer_explanation": "<brief correct answer>"}`
        }]
      })
      const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const graded = JSON.parse(raw)
      ai_evaluation[q.id] = graded
      writtenTotal += Math.min(maxScore, Math.max(0, graded.score || 0))
    } catch {
      // Fallback scoring
      const wordCount = userAnswer.split(/\s+/).length
      const fallbackScore = Math.min(maxScore, Math.round(wordCount / 10))
      ai_evaluation[q.id] = { score: fallbackScore, feedback: 'Auto-graded based on response length.', correct_answer_explanation: q.expected_answer_guide || '' }
      writtenTotal += fallbackScore
    }
  }

  const writtenScore = writtenMax > 0 ? (writtenTotal / writtenMax) * 100 : 0

  // MCQ = 40%, Written = 35%, Scenario = 25% — but split written/scenario
  const shortWrittenQs = questions.filter((q: any) => q.type === 'short_written')
  const scenarioQs = questions.filter((q: any) => q.type === 'scenario')

  let shortScore = 0
  let scenarioScore = 0
  let shortMax = 0
  let scenarioMax = 0

  for (const q of shortWrittenQs) {
    const ev = ai_evaluation[q.id]
    shortMax += q.rubric?.max_score || 10
    shortScore += ev?.score || 0
  }
  for (const q of scenarioQs) {
    const ev = ai_evaluation[q.id]
    scenarioMax += q.rubric?.max_score || 25
    scenarioScore += ev?.score || 0
  }

  const shortPct = shortMax > 0 ? (shortScore / shortMax) * 100 : 0
  const scenarioPct = scenarioMax > 0 ? (scenarioScore / scenarioMax) * 100 : 0

  const totalScore = (mcqScore * 0.40) + (shortPct * 0.35) + (scenarioPct * 0.25)

  // Generate overall AI feedback
  let ai_feedback = ''
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `A team member just completed a ${test.topic} test. 
MCQ score: ${mcqScore.toFixed(0)}%, Written: ${shortPct.toFixed(0)}%, Scenario: ${scenarioPct.toFixed(0)}%, Total: ${totalScore.toFixed(0)}%.

Write 2 encouraging sentences about their performance and 1 specific area to focus on next.`
      }]
    })
    ai_feedback = (msg.content[0] as any).text
  } catch { ai_feedback = `You scored ${totalScore.toFixed(0)}% on ${test.topic}. Keep practicing!` }

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('weekly_tests')
    .update({
      answers,
      mcq_score: mcqScore,
      written_score: shortPct,
      scenario_score: scenarioPct,
      total_score: totalScore,
      ai_evaluation,
      ai_feedback,
      status: 'graded',
      submitted_at: now,
      graded_at: now,
    })
    .eq('id', params.id)
    .select().single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Update skill track score
  if (test.skill_track_id) {
    await supabaseAdmin.from('skill_tracks').update({ test_score: totalScore, ai_feedback }).eq('id', test.skill_track_id)
  }

  // Notify admin
  const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin')
  if (admins) {
    await supabaseAdmin.from('notifications').insert(admins.map((a: any) => ({
      user_id: a.id, type: 'test_completed',
      title: `${session.user.full_name} completed ${test.topic} test`,
      body: `Score: ${totalScore.toFixed(0)}/100`,
    })))
  }

  return NextResponse.json(updated)
}

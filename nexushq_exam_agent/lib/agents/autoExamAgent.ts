import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ExamQuestion {
  id: string
  type: 'mcq' | 'short_written' | 'scenario'
  number: number
  question: string
  options?: string[]
  correct_answer?: string
  expected_answer_guide?: string
  rubric?: { max_score: number; criteria: string[] }
  difficulty: 'easy' | 'medium' | 'hard'
  topic_area: string
  hint?: string
}

interface GeneratedExam {
  questions: ExamQuestion[]
  metadata: {
    topic: string
    total_questions: number
    mcq_count: number
    written_count: number
    scenario_count: number
    estimated_time_mins: number
    difficulty_distribution: { easy: number; medium: number; hard: number }
  }
}

export async function runAutoExamAgent({
  skillTrackId,
  userId,
  topic,
  userRole,
  userName,
}: {
  skillTrackId: string
  userId: string
  topic: string
  userRole: string
  userName: string
}): Promise<{ success: boolean; testId?: string; error?: string }> {

  const startTime = Date.now()

  // Log agent run start
  const { data: agentRun } = await supabaseAdmin.from('agent_runs').insert({
    agent_type: 'skill_evaluator',
    triggered_by: 'event',
    input_data: { skill_track_id: skillTrackId, user_id: userId, topic, triggered_by: 'topic_approved' },
    status: 'running',
  }).select().single()

  try {
    // ── STEP 1: Check for existing test ──────────────────────────────────────
    const { data: existingTest } = await supabaseAdmin
      .from('weekly_tests')
      .select('id, status')
      .eq('skill_track_id', skillTrackId)
      .single()

    if (existingTest) {
      await supabaseAdmin.from('agent_runs').update({
        status: 'completed',
        output_data: { message: 'Test already exists', test_id: existingTest.id },
        actions_taken: ['Skipped — test already generated for this skill track'],
        duration_ms: Date.now() - startTime,
      }).eq('id', agentRun?.id)
      return { success: true, testId: existingTest.id }
    }

    // ── STEP 2: Get user's learning history to personalise difficulty ─────────
    const { data: pastTests } = await supabaseAdmin
      .from('weekly_tests')
      .select('topic, total_score, mcq_score, written_score')
      .eq('user_id', userId)
      .eq('status', 'graded')
      .order('graded_at', { ascending: false })
      .limit(5)

    const avgPastScore = pastTests && pastTests.length > 0
      ? pastTests.reduce((s, t) => s + (t.total_score || 0), 0) / pastTests.length
      : 65

    const skillLevel = avgPastScore >= 80 ? 'advanced' : avgPastScore >= 60 ? 'intermediate' : 'beginner'
    const pastTopics = pastTests?.map(t => t.topic).join(', ') || 'none'

    // ── STEP 3: Generate exam in 3 parallel sections ──────────────────────────
    const [mcqResult, writtenResult, scenarioResult] = await Promise.all([
      generateMCQSection(topic, skillLevel),
      generateWrittenSection(topic, skillLevel),
      generateScenarioSection(topic, skillLevel, pastTopics),
    ])

    const allQuestions: ExamQuestion[] = [
      ...mcqResult,
      ...writtenResult,
      ...scenarioResult,
    ]

    if (allQuestions.length < 50) {
      throw new Error(`Only generated ${allQuestions.length} questions — expected 50`)
    }

    const metadata: GeneratedExam['metadata'] = {
      topic,
      total_questions: allQuestions.length,
      mcq_count: mcqResult.length,
      written_count: writtenResult.length,
      scenario_count: scenarioResult.length,
      estimated_time_mins: 60,
      difficulty_distribution: {
        easy: allQuestions.filter(q => q.difficulty === 'easy').length,
        medium: allQuestions.filter(q => q.difficulty === 'medium').length,
        hard: allQuestions.filter(q => q.difficulty === 'hard').length,
      },
    }

    // ── STEP 4: Save test to database ─────────────────────────────────────────
    const { data: test, error: testError } = await supabaseAdmin
      .from('weekly_tests')
      .insert({
        user_id: userId,
        skill_track_id: skillTrackId,
        topic,
        questions: allQuestions,
        status: 'not_started',
        time_limit_mins: 60,
      })
      .select()
      .single()

    if (testError || !test) throw new Error(testError?.message || 'Failed to save test')

    // ── STEP 5: Notify the member ─────────────────────────────────────────────
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'test_ready',
      title: `Your ${topic} test is ready!`,
      body: `50 questions across MCQ, written, and scenario sections. 60-minute time limit. Good luck!`,
      action_url: `/test`,
    })

    // ── STEP 6: Update skill track with test reference ────────────────────────
    await supabaseAdmin
      .from('skill_tracks')
      .update({ test_id: test.id } as any)
      .eq('id', skillTrackId)

    // ── STEP 7: Update agent run as completed ─────────────────────────────────
    await supabaseAdmin.from('agent_runs').update({
      status: 'completed',
      output_data: {
        test_id: test.id,
        metadata,
        skill_level_detected: skillLevel,
        past_avg_score: Math.round(avgPastScore),
        personalisation: `Calibrated for ${skillLevel} level based on ${pastTests?.length || 0} past tests`,
      },
      actions_taken: [
        `Generated 25 MCQ questions on "${topic}"`,
        `Generated 15 short-written questions with rubrics`,
        `Generated 10 scenario questions with marking guides`,
        `Calibrated difficulty for ${skillLevel} level (avg past score: ${Math.round(avgPastScore)}%)`,
        `Saved test ID: ${test.id}`,
        `Notified ${userName} via in-app notification`,
      ],
      duration_ms: Date.now() - startTime,
    }).eq('id', agentRun?.id)

    return { success: true, testId: test.id }

  } catch (err: any) {
    await supabaseAdmin.from('agent_runs').update({
      status: 'failed',
      output_data: { error: err.message },
      duration_ms: Date.now() - startTime,
    }).eq('id', agentRun?.id)

    return { success: false, error: err.message }
  }
}

// ── MCQ SECTION: 25 questions ────────────────────────────────────────────────
async function generateMCQSection(topic: string, skillLevel: string): Promise<ExamQuestion[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `You are an expert technical exam creator. Generate exactly 25 MCQ questions on "${topic}" for a ${skillLevel}-level software engineer.

REQUIREMENTS:
- 8 easy questions (fundamental concepts, definitions, basic usage)
- 12 medium questions (applied knowledge, comparisons, common patterns)
- 5 hard questions (edge cases, advanced patterns, tricky gotchas)
- No two consecutive questions on the same sub-topic
- All 4 options must be plausible (no obviously wrong answers)
- Questions must be practical, not trivia

Return ONLY this JSON (no markdown):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "number": 1,
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "difficulty": "easy",
      "topic_area": "...",
      "hint": "Think about..."
    }
  ]
}`
    }],
  })

  const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(raw)
  return parsed.questions.slice(0, 25)
}

// ── SHORT WRITTEN SECTION: 15 questions ──────────────────────────────────────
async function generateWrittenSection(topic: string, skillLevel: string): Promise<ExamQuestion[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 5000,
    messages: [{
      role: 'user',
      content: `Generate exactly 15 short-written questions on "${topic}" for a ${skillLevel}-level software engineer.

Each question requires a 2-4 sentence answer. Questions should test understanding, not just recall.

Return ONLY this JSON (no markdown):
{
  "questions": [
    {
      "id": "q26",
      "type": "short_written",
      "number": 26,
      "question": "...",
      "expected_answer_guide": "A strong answer should mention: ...",
      "rubric": {
        "max_score": 10,
        "criteria": ["conceptual accuracy", "completeness", "clarity"]
      },
      "difficulty": "medium",
      "topic_area": "..."
    }
  ]
}

Numbers must start at 26 and go to 40.
Vary difficulty: 5 easy, 7 medium, 3 hard.`
    }],
  })

  const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(raw)
  return parsed.questions.slice(0, 15)
}

// ── SCENARIO SECTION: 10 questions ───────────────────────────────────────────
async function generateScenarioSection(
  topic: string,
  skillLevel: string,
  pastTopics: string
): Promise<ExamQuestion[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 5000,
    messages: [{
      role: 'user',
      content: `Generate exactly 10 scenario-based questions on "${topic}" for a ${skillLevel}-level software engineer.

These are real-world problem scenarios (1-3 paragraph answers expected). Make them practical engineering situations.
${pastTopics !== 'none' ? `The learner has studied: ${pastTopics} — you may reference these for cross-topic scenarios.` : ''}

Return ONLY this JSON (no markdown):
{
  "questions": [
    {
      "id": "q41",
      "type": "scenario",
      "number": 41,
      "question": "You are working on a production system and... [describe a realistic scenario requiring ${topic} knowledge]. How would you approach this?",
      "expected_answer_guide": "An excellent answer should cover: 1) ... 2) ... 3) ...",
      "rubric": {
        "max_score": 25,
        "criteria": ["technical accuracy", "practical application", "problem-solving approach"]
      },
      "difficulty": "hard",
      "topic_area": "..."
    }
  ]
}

Numbers must start at 41 and go to 50.
Vary difficulty: 2 medium, 8 hard.`
    }],
  })

  const raw = (msg.content[0] as any).text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(raw)
  return parsed.questions.slice(0, 10)
}

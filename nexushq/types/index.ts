import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image: string
      role: 'admin' | 'member'
      full_name: string
      avatar_url: string
      skill_topic: string | null
      streak_days: number
      job_title: string | null
    }
  }
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'admin' | 'member'
  job_title?: string
  skill_topic?: string
  streak_days: number
  timezone: string
  is_active: boolean
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  assignee_id?: string
  assigned_by?: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  estimated_hours?: number
  actual_hours: number
  due_date?: string
  completed_at?: string
  tags: string[]
  parent_task_id?: string
  ai_analysis?: TaskAIAnalysis
  created_at: string
  updated_at: string
  // Joined
  assignee?: User
}

export interface TaskAIAnalysis {
  risk_level: 'low' | 'medium' | 'high'
  risk_reason: string
  recommendation: string
}

export interface TimeBlock {
  id: string
  start: string // "09:00"
  end: string   // "11:00"
  category: 'deep_work' | 'meetings' | 'learning' | 'admin' | 'planning' | 'break'
  task_name: string
  notes?: string
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  time_blocks: TimeBlock[]
  total_hours: number
  energy_level: number
  focus_score: number
  blockers?: string
  wins?: string
  ai_summary?: string
  submitted_at: string
  user?: User
}

export interface SkillTrack {
  id: string
  user_id: string
  week_number: number
  year: number
  topic: string
  topic_approved: boolean
  resources: Resource[]
  learning_hours: number
  test_score?: number
  ai_feedback?: string
  created_at: string
}

export interface Resource {
  title: string
  url: string
  type: 'article' | 'video' | 'docs' | 'exercise'
}

export interface WeeklyTest {
  id: string
  skill_track_id: string
  user_id: string
  topic: string
  questions: Question[]
  answers: Record<string, string>
  mcq_score?: number
  written_score?: number
  total_score?: number
  ai_evaluation?: Record<string, QuestionEval>
  time_limit_mins: number
  started_at?: string
  submitted_at?: string
  graded_at?: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
}

export interface Question {
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
}

export interface QuestionEval {
  score: number
  feedback: string
  correct_answer_explanation: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_number: number
  year: number
  productivity_score: number
  skill_growth_index: number
  consistency_rating: number
  task_velocity: number
  tasks_assigned: number
  tasks_completed: number
  tasks_overdue: number
  avg_energy_level: number
  total_logged_hours: number
  strengths: string[]
  improvement_areas: string[]
  recommendations: string[]
  ai_narrative?: string
  burnout_risk_score: number
  generated_at: string
  user?: User
}

export interface Meeting {
  id: string
  title: string
  type: 'monday_planning' | 'friday_review' | 'ad_hoc'
  scheduled_at: string
  duration_mins: number
  attendees: string[]
  agenda: AgendaItem[]
  notes?: string
  action_items: ActionItem[]
  ai_talking_points: string[]
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

export interface AgendaItem {
  id: string
  title: string
  duration_mins: number
  owner?: string
  notes?: string
}

export interface ActionItem {
  id: string
  task: string
  owner: string
  due_date: string
  done: boolean
}

export interface Idea {
  id: string
  title: string
  description?: string
  submitted_by: string
  category: 'product' | 'process' | 'tech' | 'culture' | 'client'
  tags: string[]
  upvotes: number
  voters: string[]
  status: 'open' | 'under_review' | 'approved' | 'implementing' | 'done' | 'archived'
  ai_analysis?: IdeaAIAnalysis
  ai_analyzed_at?: string
  created_at: string
  submitter?: User
}

export interface IdeaAIAnalysis {
  feasibility_score: number
  impact_score: number
  effort_score: number
  time_to_implement: 'days' | 'weeks' | 'months'
  potential_risks: string[]
  strengths: string[]
  narrative: string
  recommendation: 'pursue' | 'refine' | 'deprioritize' | 'park'
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body?: string
  action_url?: string
  read: boolean
  created_at: string
}

export interface AgentRun {
  id: string
  agent_type: 'productivity_monitor' | 'task_assigner' | 'skill_evaluator' | 'pattern_predictor'
  triggered_by: 'scheduled' | 'manual' | 'event'
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  actions_taken: unknown[]
  status: 'running' | 'completed' | 'failed'
  duration_ms?: number
  created_at: string
}

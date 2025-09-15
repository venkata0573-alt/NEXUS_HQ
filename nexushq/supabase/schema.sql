-- ═══════════════════════════════════════════════════════════════
-- NEXUSHQ DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor (one click)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR(100),
  avatar_url VARCHAR,
  role VARCHAR(10) DEFAULT 'member' CHECK (role IN ('admin','member')),
  job_title VARCHAR(100),
  skill_topic VARCHAR(200),
  streak_days INT DEFAULT 0,
  timezone VARCHAR DEFAULT 'UTC',
  slack_user_id VARCHAR,
  work_style VARCHAR(20) DEFAULT 'deep_worker',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASKS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(2) DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('backlog','todo','in_progress','in_review','done','blocked')),
  estimated_hours DECIMAL(4,1),
  actual_hours DECIMAL(4,1) DEFAULT 0,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DAILY LOGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  time_blocks JSONB NOT NULL DEFAULT '[]',
  total_hours DECIMAL(3,1) DEFAULT 0,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  focus_score INT CHECK (focus_score BETWEEN 1 AND 10),
  blockers TEXT,
  wins TEXT,
  ai_summary TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ─── SKILL TRACKS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  year INT NOT NULL,
  topic VARCHAR(200) NOT NULL,
  topic_approved BOOLEAN DEFAULT FALSE,
  resources JSONB DEFAULT '[]',
  learning_hours DECIMAL(4,1) DEFAULT 0,
  test_score DECIMAL(5,2),
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEEKLY TESTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_track_id UUID REFERENCES skill_tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic VARCHAR(200) NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB DEFAULT '{}',
  mcq_score DECIMAL(5,2),
  written_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  ai_evaluation JSONB,
  time_limit_mins INT DEFAULT 60,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','graded'))
);

-- ─── WEEKLY REPORTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  year INT NOT NULL,
  productivity_score DECIMAL(5,2) DEFAULT 0,
  skill_growth_index DECIMAL(5,2) DEFAULT 0,
  consistency_rating DECIMAL(5,2) DEFAULT 0,
  task_velocity DECIMAL(5,2) DEFAULT 0,
  tasks_assigned INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  tasks_overdue INT DEFAULT 0,
  avg_energy_level DECIMAL(3,1) DEFAULT 0,
  total_logged_hours DECIMAL(5,1) DEFAULT 0,
  strengths TEXT[] DEFAULT '{}',
  improvement_areas TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  ai_narrative TEXT,
  burnout_risk_score DECIMAL(3,1) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_number, year)
);

-- ─── MEETINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) DEFAULT 'ad_hoc' CHECK (type IN ('monday_planning','friday_review','ad_hoc')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_mins INT DEFAULT 60,
  attendees UUID[] DEFAULT '{}',
  agenda JSONB DEFAULT '[]',
  notes TEXT,
  action_items JSONB DEFAULT '[]',
  ai_talking_points TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── IDEAS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(20) DEFAULT 'product' CHECK (category IN ('product','process','tech','culture','client')),
  tags TEXT[] DEFAULT '{}',
  upvotes INT DEFAULT 0,
  voters UUID[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','under_review','approved','implementing','done','archived')),
  ai_analysis JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── IDEA COMMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASK COMMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  action_url VARCHAR,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AGENT RUNS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type VARCHAR(50) NOT NULL,
  triggered_by VARCHAR(20) DEFAULT 'manual',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  actions_taken JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_skill_tracks_user ON skill_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tests_user ON weekly_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user ON weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_ideas_votes ON ideas(upvotes DESC);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by Next.js API routes)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON daily_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON skill_tracks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON weekly_tests FOR ALL USING (true);
CREATE POLICY "Service role full access" ON weekly_reports FOR ALL USING (true);
CREATE POLICY "Service role full access" ON meetings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ideas FOR ALL USING (true);
CREATE POLICY "Service role full access" ON idea_comments FOR ALL USING (true);
CREATE POLICY "Service role full access" ON task_comments FOR ALL USING (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true);
CREATE POLICY "Service role full access" ON agent_runs FOR ALL USING (true);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED DEMO DATA (optional) ───────────────────────────────────
-- INSERT INTO users (email, full_name, role, job_title) VALUES
--   ('admin@yourcompany.com', 'Your Name', 'admin', 'CEO / Founder');

SELECT 'NexusHQ schema created successfully!' as status;

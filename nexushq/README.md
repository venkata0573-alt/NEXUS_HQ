# NexusHQ — Team Intelligence Platform

> Enterprise-grade productivity platform for your 3-person team. Google login, AI-powered analytics, task management, skill development, weekly tests, and AI agents — all free to deploy.

---

## 🚀 Deploy in 30 Minutes (100% Free)

### Stack
| Layer | Service | Cost |
|---|---|---|
| Frontend + API | **Vercel** | Free |
| Database | **Supabase** (PostgreSQL) | Free (500MB) |
| Auth | **Google OAuth** | Free |
| AI | **Anthropic Claude API** | ~$0.01/request |
| Domain | Vercel subdomain | Free |

---

## Step 1 — Supabase Setup (5 min)

1. Go to **[supabase.com](https://supabase.com)** → Create account → New Project
2. Choose a region close to you, set a strong DB password
3. Wait ~2 minutes for project to spin up
4. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → click **Run**
5. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Google OAuth (5 min)

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://YOUR-APP.vercel.app/api/auth/callback/google
   ```
6. Copy **Client ID** → `GOOGLE_CLIENT_ID`
7. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

---

## Step 3 — Anthropic API Key (2 min)

1. Go to **[console.anthropic.com](https://console.anthropic.com)**
2. Create API key → copy → `ANTHROPIC_API_KEY`
3. Add $5 credits to start (enough for weeks of usage)

---

## Step 4 — Push to GitHub (2 min)

```bash
# In the nexushq folder:
git init
git add .
git commit -m "NexusHQ v1.0 — initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexushq.git
git push -u origin main
```

---

## Step 5 — Deploy to Vercel (3 min)

1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub
2. Click **New Project** → Import your `nexushq` repo
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** and add ALL of these:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXTAUTH_URL=https://YOUR-APP.vercel.app
NEXTAUTH_SECRET=run: openssl rand -base64 32
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
ADMIN_EMAIL=your-email@gmail.com
NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
```

5. Click **Deploy** → wait ~60 seconds → **Your app is live!** 🎉

---

## Step 6 — Go Live

1. Visit `https://your-app.vercel.app`
2. Click **Continue with Google** — your account becomes **Admin** automatically
3. Share the URL with your 3 team members
4. They sign in with their Google accounts → become **Members**
5. Everyone is live instantly!

---

## Features

### 👑 Admin Features
- **Command Center** — Real-time view of all 3 team members
- **Task Kanban** — Create, assign, and track tasks across 5 columns
- **Team Analytics** — Productivity scores, burnout gauges, radar charts
- **Meetings** — Schedule Monday planning + Friday review with AI talking points
- **Weekly Reports** — Generate AI-written performance reports for each member
- **AI Agents** — 4 autonomous agents: Monitor, Task Assigner, Skill Evaluator, Pattern Predictor
- **Employee Profiles** — Deep dive into each member's metrics
- **Skill Approval** — Approve team members' weekly learning topics

### 👤 Member Features
- **Personal Dashboard** — Score ring, streak counter, burnout gauge
- **My Tasks** — Personal kanban filtered to your assignments
- **Daily Log** — Timeline block builder with 6 categories, energy + focus rating
- **Skill Track** — Pick weekly topic, get AI-curated resources
- **Weekly Test** — 50-question AI-generated test (25 MCQ + 15 written + 10 scenario)
- **My Reports** — Weekly AI performance analysis with strengths + improvements
- **AI Chat** — Ask Claude anything about your team data

### 🤖 AI Features (powered by Claude)
- Daily log summaries with pattern detection
- 50-question test generation on any topic
- AI grading of written/scenario questions with rubric scoring
- Weekly productivity report narratives
- Productivity monitoring agent (daily insights)
- Task assignment agent (breaks goals → tasks → assigns by skill)
- Pattern prediction agent (4-week trend analysis)
- Idea board analysis (feasibility/impact/effort scoring)
- AI chat assistant with real-time team context

### 💡 Idea Board
- Submit, vote, and discuss team ideas
- AI analysis per idea (feasibility, impact, effort, recommendation)
- Category filtering (Product/Process/Tech/Culture/Client)
- Convert ideas to tasks (admin)

---

## Local Development

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/nexushq
cd nexushq

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Fill in all values in .env.local

# Run database migrations (paste schema.sql in Supabase SQL Editor)

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables Reference

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel URL (or `http://localhost:3000` for dev) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ADMIN_EMAIL` | Your Google account email |

---

## Weekly Workflow

| Day | Action |
|---|---|
| **Monday** | Members select skill topic → Admin approves → Monday planning meeting |
| **Mon–Thu** | Daily logs, task updates, learning |
| **Friday 9 AM** | Tests unlock for all members (60 min window) |
| **Friday 5 PM** | Weekly reports auto-generate |
| **Friday 5:30 PM** | Friday review meeting with AI talking points |
| **Sunday** | Pattern prediction agent runs, votes reset |

---

## Troubleshooting

**Login not working?**
→ Check that your Vercel URL is added to Google OAuth redirect URIs

**Database errors?**
→ Make sure you ran the full `schema.sql` in Supabase SQL Editor

**AI features not working?**
→ Verify `ANTHROPIC_API_KEY` is set in Vercel environment variables

**First user not becoming admin?**
→ Set `ADMIN_EMAIL` to your Google account email before first login

---

## Architecture

```
nexushq/
├── app/
│   ├── (auth)/login/          # Google OAuth login page
│   ├── (admin)/               # Admin-only pages (dashboard, tasks, meetings...)
│   ├── (member)/              # Member pages (dashboard, daily-log, test...)
│   ├── idea-board/            # Shared idea board
│   └── api/                   # All API routes
│       ├── auth/              # NextAuth Google OAuth
│       ├── tasks/             # Task CRUD
│       ├── daily-logs/        # Daily time logs + AI summaries
│       ├── tests/             # Test generation + AI grading
│       ├── reports/           # Weekly AI reports
│       ├── meetings/          # Meeting management
│       ├── ideas/             # Idea board + AI analysis
│       ├── agents/            # 4 AI agents
│       ├── skill-tracks/      # Skill development
│       ├── analytics/         # Team analytics
│       └── ai/chat/           # AI assistant chat
├── components/
│   ├── ui/                    # Stat cards, avatars, charts, badges
│   ├── charts/                # Recharts visualizations
│   └── shared/                # Sidebar, TopBar, AIChat
├── lib/supabase.ts            # Database client
├── middleware.ts              # Route protection
└── supabase/schema.sql        # Complete DB schema
```

---

Built with Next.js 14, Supabase, NextAuth, Claude AI, Recharts, Tailwind CSS.

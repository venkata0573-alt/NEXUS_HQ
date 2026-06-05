# NexusHQ — Team Intelligence Platform

NexusHQ is a Next.js-based team productivity and intelligence application designed for small teams to manage tasks, track execution, monitor productivity, develop skills, and generate AI-powered insights.

## Overview

NexusHQ combines task management, daily logs, skill development, team analytics, AI chat, and performance reporting into one business productivity system. The application supports admin and member workflows, allowing leaders to monitor team execution while helping members track progress, learning, energy, focus, and productivity.

The goal of this project is to create a lightweight team operating system for small teams where work, learning, performance, and AI-driven insights can be managed from one place.

## Key Features

- Google OAuth authentication with NextAuth
- Supabase database integration
- Admin and member dashboards
- Team productivity analytics
- Task management and tracking
- Daily log and activity tracking
- Skill development workflow
- Weekly test and learning system
- AI-powered chat assistant
- AI-generated reports and insights
- Idea board for team suggestions
- Charts and visual dashboards using Recharts
- Responsive UI with Tailwind CSS
- Role-based application structure

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- NextAuth
- Google OAuth
- Anthropic Claude API
- Recharts
- Zustand
- React Query
- Zod
- React Hook Form
- Lucide React

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18.17+** (Node 20 recommended) and npm
- A free **[Supabase](https://supabase.com)** account
- A **[Google Cloud](https://console.cloud.google.com)** project with OAuth 2.0 credentials
- An **[Anthropic](https://console.anthropic.com)** API key for the AI features

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/nexushq.git
cd nexushq
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env.local
```

```env
# ─── Supabase (Settings → API) ───────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ─── NextAuth ────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run: openssl rand -base64 32

# ─── Google OAuth (Cloud Console → Credentials) ──────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── Anthropic AI ────────────────────────────────────────────
ANTHROPIC_API_KEY=your_anthropic_api_key

# ─── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NexusHQ

# ─── Admin (first Google login with this email becomes admin) ─
ADMIN_EMAIL=your_email@gmail.com
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `NEXTAUTH_URL` | Your app URL (`http://localhost:3000` in dev) |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ADMIN_EMAIL` | The Google account that should be admin |

### 3. Set up the database

1. Create a new project in Supabase.
2. Open **SQL Editor**, paste the entire contents of `supabase/schema.sql`, and click **Run**.

### 4. Configure Google OAuth

In Google Cloud Console → APIs & Services → Credentials, create an **OAuth 2.0 Client ID** (type: Web application) and add these authorized redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://YOUR-APP.vercel.app/api/auth/callback/google
```

### 5. Run the dev server

```bash
npm run dev
```

Visit **http://localhost:3000**. Sign in with the Google account set in `ADMIN_EMAIL` to become the admin; other team members who sign in are added as members.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |

## Deployment

NexusHQ deploys cleanly to **Vercel**:

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), import the repository (the Next.js framework is auto-detected).
3. Add all environment variables from your `.env.local` to the Vercel project settings.
4. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your deployed URL, and add the production redirect URI to Google OAuth.
5. Deploy.

## Project Structure

```text
nexushq/
├── app/
│   ├── (admin)/
│   ├── (member)/
│   ├── idea-board/
│   ├── api/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── charts/
│   ├── shared/
│   └── ui/
├── lib/
│   └── supabase.ts
├── supabase/
│   └── schema.sql
├── types/
│   └── index.ts
├── middleware.ts
├── package.json
└── README.md
```

<img width="1512" height="822" alt="Screenshot 2026-06-05 at 6 16 12 PM" src="https://github.com/user-attachments/assets/dfcaf701-eeaa-4694-91bc-dbbc365fccf6" />
<img width="1512" height="822" alt="Screenshot 2026-06-05 at 6 16 17 PM" src="https://github.com/user-attachments/assets/ccb7d7d6-d439-4816-9ca2-f4e491fc8ff3" />
<img width="1512" height="822" alt="Screenshot 2026-06-05 at 6 16 33 PM" src="https://github.com/user-attachments/assets/03763a07-c738-4e98-87b6-d09d1ae27597" />
<img width="1512" height="822" alt="Screenshot 2026-06-05 at 6 16 42 PM" src="https://github.com/user-attachments/assets/9d68be2c-31f9-49ca-9f7b-ead33bb66244" />




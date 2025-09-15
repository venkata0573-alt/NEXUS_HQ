'use client'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// ─── STAT CARD ────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, icon, color = '#4f8ef7', trend
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="card animate-slide-up" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6 }}>{sub}</div>}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: trend.value >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span style={{ fontSize: 11, color: '#484f58' }}>{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AVATAR ───────────────────────────────────────────────────────
export function Avatar({ user, size = 32 }: { user: { full_name?: string; avatar_url?: string; email?: string }; size?: number }) {
  const name = user.full_name || user.email || 'U'
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#4f8ef7', '#7c6af5', '#06d6a0', '#f5a623', '#f85149']
  const colorIndex = name.charCodeAt(0) % colors.length

  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${colors[colorIndex]}, ${colors[(colorIndex + 1) % colors.length]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: '#fff',
    }}>{initials}</div>
  )
}

// ─── PRIORITY BADGE ───────────────────────────────────────────────
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    P0: { label: 'P0 Critical', cls: 'priority-p0' },
    P1: { label: 'P1 High', cls: 'priority-p1' },
    P2: { label: 'P2 Medium', cls: 'priority-p2' },
    P3: { label: 'P3 Low', cls: 'priority-p3' },
  }
  const { label, cls } = map[priority] || map.P2
  return <span className={cls} style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 7px', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
}

// ─── STATUS BADGE ─────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
    in_review: 'In Review', done: 'Done', blocked: 'Blocked',
  }
  return (
    <span className={`status-${status}`} style={{ fontSize: 11, fontWeight: 500, borderRadius: 100, padding: '3px 10px' }}>
      {labels[status] || status}
    </span>
  )
}

// ─── SCORE RING ───────────────────────────────────────────────────
export function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const color = score >= 80 ? '#3fb950' : score >= 60 ? '#f5a623' : '#f85149'
  const data = [{ value: score }, { value: 100 - score }]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={size * 0.35} outerRadius={size * 0.48} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              <Cell fill={color} />
              <Cell fill="#1c2333" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span style={{ fontSize: 11, color: '#8b949e' }}>{label}</span>}
    </div>
  )
}

// ─── BURNOUT GAUGE ────────────────────────────────────────────────
export function BurnoutGauge({ score }: { score: number }) {
  const color = score <= 3 ? '#3fb950' : score <= 6 ? '#f5a623' : '#f85149'
  const label = score <= 3 ? 'LOW RISK' : score <= 6 ? 'MODERATE' : score <= 8 ? 'HIGH RISK' : 'CRITICAL'
  const pct = (score / 10) * 100
  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#8b949e' }}>Burnout Risk</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace' }}>{score.toFixed(1)}/10</span>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────
export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>{title}</h2>
        {sub && <p style={{ fontSize: 13, color: '#8b949e' }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <div style={{ fontSize: 32, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#8b949e' }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: '#484f58', maxWidth: 300 }}>{sub}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

// ─── LOADING SPINNER ──────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid #30363d`, borderTopColor: '#4f8ef7',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ─── TAG ──────────────────────────────────────────────────────────
export function Tag({ label }: { label: string }) {
  return <span className="tag">{label}</span>
}

// ─── AI BADGE ─────────────────────────────────────────────────────
export function AIBadge({ label = 'AI' }: { label?: string }) {
  return <span className="ai-badge">✦ {label}</span>
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = '#4f8ef7', height = 4 }: { value: number; max?: number; color?: string; height?: number }) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

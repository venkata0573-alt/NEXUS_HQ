'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#e6edf3' },
  itemStyle: { color: '#8b949e' },
}

// ─── TASK VELOCITY ────────────────────────────────────────────────
export function TaskVelocityChart({ data }: { data?: any[] }) {
  const mockData = data || [
    { week: 'Wk 1', assigned: 8, completed: 6 },
    { week: 'Wk 2', assigned: 10, completed: 9 },
    { week: 'Wk 3', assigned: 7, completed: 5 },
    { week: 'Wk 4', assigned: 12, completed: 11 },
    { week: 'Wk 5', assigned: 9, completed: 8 },
    { week: 'Wk 6', assigned: 11, completed: 10 },
  ]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={mockData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <defs>
          <linearGradient id="assignedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3fb950" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis dataKey="week" tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="assigned" stroke="#4f8ef7" strokeWidth={2} fill="url(#assignedGrad)" name="Assigned" />
        <Area type="monotone" dataKey="completed" stroke="#3fb950" strokeWidth={2} fill="url(#completedGrad)" name="Completed" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── TEAM RADAR ───────────────────────────────────────────────────
export function TeamRadarChart({ members }: { members: any[] }) {
  const axes = ['Tasks', 'Logs', 'Skills', 'Ideas', 'Meetings', 'Focus']
  const colors = ['#4f8ef7', '#3fb950', '#f5a623']

  const data = axes.map(axis => {
    const entry: any = { axis }
    members.slice(0, 3).forEach((m, i) => {
      entry[m.full_name?.split(' ')[0] || `M${i+1}`] = Math.round(60 + Math.random() * 35)
    })
    return entry
  })

  if (members.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 12 }}>
        No team data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="#21262d" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: '#484f58', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 9 }} />
        {members.slice(0, 3).map((m, i) => (
          <Radar key={m.id} name={m.full_name?.split(' ')[0]} dataKey={m.full_name?.split(' ')[0]} stroke={colors[i]} fill={colors[i]} fillOpacity={0.1} strokeWidth={2} />
        ))}
        <Tooltip {...TOOLTIP_STYLE} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── TIME DISTRIBUTION ────────────────────────────────────────────
export function TimeDistributionChart({ data }: { data: any[] }) {
  const COLORS = { deep_work: '#4f8ef7', meetings: '#3fb950', learning: '#f5a623', admin: '#fb923c', break: '#f85149', planning: '#7c6af5' }
  const chartData = data.map(d => ({ name: d.label, value: parseFloat(d.hours.toFixed(1)), color: COLORS[d.id as keyof typeof COLORS] || '#8b949e' }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(val) => [`${val}h`, '']} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chartData.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#8b949e', flex: 1 }}>{d.name}</span>
            <span style={{ fontSize: 12, color: '#e6edf3', fontFamily: 'JetBrains Mono, monospace' }}>{d.value}h</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SKILL SCORE TREND ────────────────────────────────────────────
export function SkillScoreTrendChart({ data }: { data?: any[] }) {
  const mockData = data || [
    { week: 'Wk 1', score: 65 },
    { week: 'Wk 2', score: 71 },
    { week: 'Wk 3', score: 68 },
    { week: 'Wk 4', score: 78 },
    { week: 'Wk 5', score: 82 },
    { week: 'Wk 6', score: 84 },
  ]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={mockData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis dataKey="week" tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Score']} />
        {/* Target line at 80% */}
        <Line type="monotone" dataKey="score" stroke="#7c6af5" strokeWidth={2.5} dot={{ fill: '#7c6af5', r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── ENERGY TREND ─────────────────────────────────────────────────
export function EnergyTrendChart({ data }: { data?: any[] }) {
  const mockData = data || Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    energy: Math.max(1, Math.min(5, 3 + Math.round((Math.random() - 0.5) * 2))),
  }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={mockData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <defs>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f5a623" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis dataKey="day" tick={{ fill: '#484f58', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[1, 5]} tick={{ fill: '#484f58', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}/5`, 'Energy']} />
        <Area type="monotone" dataKey="energy" stroke="#f5a623" strokeWidth={2} fill="url(#energyGrad)" dot={{ fill: '#f5a623', r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── PRODUCTIVITY HEATMAP ─────────────────────────────────────────
export function ProductivityHeatmap({ data }: { data?: Record<string, number> }) {
  const weeks = 12
  const days = 7
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const getColor = (score?: number) => {
    if (!score) return '#161b22'
    if (score >= 85) return '#39d353'
    if (score >= 70) return '#26a641'
    if (score >= 50) return '#006d32'
    return '#0e4429'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{ width: 14, height: 14, fontSize: 9, color: '#484f58', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i % 2 === 0 ? d : ''}</div>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {Array.from({ length: days }, (_, d) => {
              const score = data?.[`${w}-${d}`] || (Math.random() > 0.3 ? Math.round(50 + Math.random() * 50) : 0)
              return (
                <div key={d} className="heatmap-cell" style={{ background: getColor(score) }}
                  title={score ? `Score: ${score}` : 'No data'} />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#484f58' }}>Less</span>
        {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: '#484f58' }}>More</span>
      </div>
    </div>
  )
}

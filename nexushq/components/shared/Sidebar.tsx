'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard, CheckSquare, Users, Calendar, BarChart3,
  Bot, Lightbulb, BookOpen, ClipboardList, FlaskConical,
  LogOut, Settings, ChevronLeft, ChevronRight, Bell, Zap
} from 'lucide-react'

const adminNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Command Center' },
  { href: '/tasks', icon: CheckSquare, label: 'All Tasks' },
  { href: '/employees', icon: Users, label: 'Team' },
  { href: '/meetings', icon: Calendar, label: 'Meetings' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/agents', icon: Bot, label: 'AI Agents' },
  { href: '/idea-board', icon: Lightbulb, label: 'Idea Board' },
]

const memberNav = [
  { href: '/my-dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
  { href: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
  { href: '/daily-log', icon: ClipboardList, label: 'Daily Log' },
  { href: '/skill-track', icon: BookOpen, label: 'Skill Track' },
  { href: '/test', icon: FlaskConical, label: 'Weekly Test' },
  { href: '/idea-board', icon: Lightbulb, label: 'Idea Board' },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = session?.user?.role === 'admin'
  const nav = isAdmin ? adminNav : memberNav

  const Avatar = ({ size = 32 }: { size?: number }) => {
    const name = session?.user?.full_name || session?.user?.name || 'U'
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    return session?.user?.avatar_url ? (
      <img src={session.user.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 600, color: '#fff',
        flexShrink: 0,
      }}>{initials}</div>
    )
  }

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      background: '#0d1117',
      borderRight: '1px solid #30363d',
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 16px' : '20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
          borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif',
        }}>N</div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#e6edf3' }}>NexusHQ</div>
            <div style={{ fontSize: 9, color: '#4f8ef7', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
              {isAdmin ? 'ADMIN' : 'MEMBER'}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: '#30363d', margin: '0 0 8px' }} />

      {/* Role badge */}
      {!collapsed && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{
            background: isAdmin ? 'rgba(79,142,247,0.1)' : 'rgba(63,185,80,0.1)',
            border: `1px solid ${isAdmin ? 'rgba(79,142,247,0.3)' : 'rgba(63,185,80,0.3)'}`,
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, color: isAdmin ? '#4f8ef7' : '#3fb950',
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Zap size={10} />
            {isAdmin ? 'Admin Access' : 'Team Member'}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className="sidebar-item" style={{
              background: active ? 'rgba(79,142,247,0.1)' : undefined,
              color: active ? '#4f8ef7' : undefined,
              padding: collapsed ? '9px' : '9px 12px',
              justifyContent: collapsed ? 'center' : undefined,
              marginBottom: 2,
            }}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ height: 1, background: '#30363d' }} />

      {/* Bottom */}
      <div style={{ padding: '8px 8px 16px' }}>
        {!collapsed && (
          <div style={{ padding: '8px 12px', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={32} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.user?.full_name || session?.user?.name}
                </div>
                <div style={{ fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.user?.email}
                </div>
              </div>
            </div>
            {(session?.user?.streak_days ?? 0) > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#f5a623', display: 'flex', alignItems: 'center', gap: 4 }}>
                🔥 {session?.user?.streak_days ?? 0}-day streak
              </div>
            )}
          </div>
        )}

        <button className="sidebar-item" style={{ width: '100%', padding: collapsed ? '9px' : '9px 12px', justifyContent: collapsed ? 'center' : undefined }}
          onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute', top: 20, right: -12,
          width: 24, height: 24,
          background: '#1c2333', border: '1px solid #30363d',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8b949e', transition: 'background 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#21262d')}
        onMouseLeave={e => (e.currentTarget.style.background = '#1c2333')}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}

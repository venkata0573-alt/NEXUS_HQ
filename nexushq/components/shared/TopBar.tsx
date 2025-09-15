'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Search, Plus, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export function TopBar() {
  const { data: session } = useSession()
  const [showNotifs, setShowNotifs] = useState(false)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 30000,
  })

  const unread = notifs.filter((n: any) => !n.read).length
  const formatRelativeTime = (value: string) => {
    const diffMs = Date.now() - new Date(value).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <header style={{
      height: 56,
      background: '#0d1117',
      borderBottom: '1px solid #30363d',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#484f58' }} />
        <input
          placeholder="Search tasks, ideas, members..."
          className="input-dark"
          style={{ paddingLeft: 36, height: 34, fontSize: 13 }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Date */}
      <div style={{ fontSize: 12, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-ghost"
          style={{ padding: '6px', position: 'relative' }}
          onClick={() => setShowNotifs(!showNotifs)}
        >
          <Bell size={16} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#f85149', color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        {showNotifs && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 8,
            width: 320, background: '#161b22',
            border: '1px solid #30363d', borderRadius: 12,
            boxShadow: '0 16px 32px rgba(0,0,0,0.4)',
            zIndex: 100, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Notifications</span>
              {unread > 0 && <span style={{ fontSize: 11, color: '#4f8ef7', cursor: 'pointer' }}>Mark all read</span>}
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
                  All caught up! ✓
                </div>
              ) : notifs.slice(0, 10).map((n: any) => (
                <div key={n.id} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #21262d',
                  background: n.read ? 'transparent' : 'rgba(79,142,247,0.04)',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, color: '#e6edf3', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#8b949e' }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>
                    {formatRelativeTime(n.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        {session?.user?.avatar_url ? (
          <img src={session.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#fff',
          }}>
            {(session?.user?.full_name || session?.user?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <span style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500 }}>
          {(session?.user?.full_name || session?.user?.name || '').split(' ')[0]}
        </span>
        <ChevronDown size={12} style={{ color: '#484f58' }} />
      </div>
    </header>
  )
}

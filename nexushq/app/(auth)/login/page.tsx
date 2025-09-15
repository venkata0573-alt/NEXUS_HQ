'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const error = searchParams.get('error')
  const errorMessage = error === 'OAuthSignin'
    ? 'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your local environment variables, then restart the app.'
    : error
      ? 'Sign-in failed. Check the app auth environment variables and try again.'
      : null

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(session?.user?.role === 'admin' ? '/dashboard' : '/my-dashboard')
    }
  }, [status, session, router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/' })
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060912' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4f8ef7', borderTopColor: 'transparent' }} />
          <p style={{ color: '#8b949e', fontSize: 14 }}>Loading NexusHQ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#060912' }}>
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Glow orbs */}
      <div className="absolute" style={{ width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      {/* Card */}
      <div className="relative z-10 animate-slide-up" style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: 20,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 420,
        margin: '0 16px',
      }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
            fontFamily: 'Syne, sans-serif',
          }}>N</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e6edf3' }}>NexusHQ</div>
            <div style={{ fontSize: 11, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>TEAM INTELLIGENCE</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#30363d', margin: '24px 0' }} />

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: '#8b949e', marginBottom: 32 }}>
          Sign in with your Google account to access the team workspace.
        </p>

        {errorMessage && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(248, 81, 73, 0.35)',
              background: 'rgba(248, 81, 73, 0.08)',
              color: '#ffb4ad',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#1c2333' : '#ffffff',
            color: '#1a1a1a',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#f0f0f0' }}
          onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#ffffff' }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#999', borderTopColor: 'transparent' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p style={{ fontSize: 12, color: '#484f58', textAlign: 'center', marginTop: 24 }}>
          Access is restricted to invited team members only.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32, justifyContent: 'center' }}>
          {['AI Analytics', 'Task Board', 'Skill Tests', 'Daily Logs', 'Reports'].map(f => (
            <span key={f} style={{
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: 100, padding: '4px 12px',
              fontSize: 11, color: '#8b949e',
              fontFamily: 'JetBrains Mono, monospace',
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

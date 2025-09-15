import { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id, role, is_active')
          .eq('email', user.email)
          .single()

        if (existing) {
          if (!existing.is_active) return false
          await supabaseAdmin
            .from('users')
            .update({ avatar_url: user.image, updated_at: new Date().toISOString() })
            .eq('email', user.email)
        } else {
          const { count } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
          const adminEmail = process.env.ADMIN_EMAIL
          const role = count === 0 || user.email === adminEmail ? 'admin' : 'member'

          await supabaseAdmin.from('users').insert({
            email: user.email,
            full_name: user.name,
            avatar_url: user.image,
            role,
            streak_days: 0,
          })
        }
        return true
      } catch (err) {
        console.error('SignIn error:', err)
        return false
      }
    },
    async session({ session }) {
      if (session.user?.email) {
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('id, role, full_name, avatar_url, skill_topic, streak_days, job_title')
          .eq('email', session.user.email)
          .single()

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role
          session.user.full_name = dbUser.full_name
          session.user.avatar_url = dbUser.avatar_url
          session.user.skill_topic = dbUser.skill_topic
          session.user.streak_days = dbUser.streak_days
          session.user.job_title = dbUser.job_title
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.email = user.email
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

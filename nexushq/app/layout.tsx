import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/shared/Providers'

export const metadata: Metadata = {
  title: 'NexusHQ — Team Intelligence Platform',
  description: 'Enterprise team productivity, task management, and AI performance analytics',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

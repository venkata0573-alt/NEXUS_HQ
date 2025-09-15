import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          0: '#060912',
          1: '#0d1117',
          2: '#161b22',
          3: '#1c2333',
          4: '#21262d',
        },
        brand: {
          DEFAULT: '#4f8ef7',
          2: '#7c6af5',
          3: '#06d6a0',
        },
        border: { DEFAULT: '#30363d', 2: '#21262d' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'count-up': 'countUp 1s ease',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(79,142,247,0.3)' }, '50%': { boxShadow: '0 0 20px 4px rgba(79,142,247,0.15)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config

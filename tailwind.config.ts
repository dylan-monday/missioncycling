import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mission-blue': '#BAE0F7',
        'broadcast-red': '#CC2936',
        'broadcast-blue': '#1A3A5C',
        'broadcast-yellow': '#FFD700',
        'broadcast-gold': '#FFC107',
        'crt-black': '#0A0A0A',
      },
      fontFamily: {
        'broadcast': ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
      animation: {
        'slam-in': 'slamIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scan-line': 'scanLine 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        slamIn: {
          '0%': {
            transform: 'translateX(-100%) scale(1.2)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0) scale(1)',
            opacity: '1',
          },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.98' },
        },
      },
    },
  },
  plugins: [],
}
export default config

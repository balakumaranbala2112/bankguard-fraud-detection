/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c2d4ff',
          300: '#93b1ff',
          400: '#5e87ff',
          500: '#3a5bff',
          600: '#1e35f5',
          700: '#1525e0',
          800: '#1720b5',
          900: '#19228e',
        },
        danger: {
          50: '#fff1f0',
          100: '#ffe0de',
          200: '#ffc6c3',
          300: '#ff9d98',
          400: '#ff6b64',
          500: '#ff3d35',
          600: '#ed1c13',
          700: '#c8110a',
          800: '#a5120c',
          900: '#881610',
        },
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        warn: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          0: '#ffffff',
          50: '#f8faff',
          100: '#f0f4fe',
          200: '#e4ebfd',
          800: '#1a1f36',
          900: '#0f1225',
          950: '#080c1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(30,53,245,0.06)',
        'card-hover': '0 8px 32px 0 rgba(30,53,245,0.14)',
        danger: '0 4px 20px 0 rgba(237,28,19,0.25)',
        glow: '0 0 40px 0 rgba(58,91,255,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}

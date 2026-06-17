/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          '2': '#111118',
          '3': '#18181f',
          '4': '#1e1e28',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          '2': 'rgba(255,255,255,0.12)',
        },
        text: {
          DEFAULT: '#f0f0f8',
          '2': '#9898b0',
          '3': '#5a5a70',
        },
        accent: {
          DEFAULT: '#6c63ff',
          '2': '#8b83ff',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

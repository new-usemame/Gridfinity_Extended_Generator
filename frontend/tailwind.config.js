/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'grid': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        'slate': {
          850: '#172033',
          950: '#0a0f1a',
        },
        white: {
          DEFAULT: '#ffffff',
          '/10': 'rgba(255, 255, 255, 0.1)',
          '/80': 'rgba(255, 255, 255, 0.8)',
        },
        black: {
          DEFAULT: '#000000',
          '/70': 'rgba(0, 0, 0, 0.7)',
          '/80': 'rgba(0, 0, 0, 0.8)',
          '/90': 'rgba(0, 0, 0, 0.9)',
        },
      },
      fontFamily: {
        'display': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

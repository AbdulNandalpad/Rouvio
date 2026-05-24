import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1B3A6B',
        accent: {
          DEFAULT: '#00C9A7',
          dark: '#00A88C',
        },
        highlight: '#FF8C42',
        surface: '#F0F6FF',
        'dark-bg': '#0F1F3D',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        modal: '24px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}

export default config

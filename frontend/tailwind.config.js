/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B4F8A', dark: '#163f6e' },
        border: 'hsl(var(--border))',
      },
    },
  },
  plugins: [],
}

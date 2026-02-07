/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{src,pages,utils}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jh-green': '#0b7a4a',
        'jh-header': '#f7f8fa',
        'jh-light': '#f7f8fa',
        'jh-text': '#1f2d2b',
        'jh-blue': '#4a90e2',
      },
      borderRadius: { '2xl': '1rem' },
      boxShadow: { 'sm': '0 1px 3px rgba(0,0,0,0.05)' },
      animation: { 'fade-in': 'fadeIn 200ms ease-in' },
      keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } } },
    },
  },
  plugins: [],
}

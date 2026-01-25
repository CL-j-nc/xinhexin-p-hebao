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
        'jh-header': '#00c37b',
        'jh-light': '#f7f8fa',
        'jh-text': '#1f2d2b',
        'jh-blue': '#4a90e2',
      },
      animation: { 'spin-slow': 'spin 3s linear infinite' }
    },
  },
  plugins: [],
}

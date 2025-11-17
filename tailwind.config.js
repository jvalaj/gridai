/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'Courier New',
          'Consolas',
          'Monaco',
          'Lucida Console',
          'monospace',
        ],
      },
      colors: {
        'jarvis-blue': '#06B6D4',
        'jarvis-dark': '#0a0e1a',
      },
    },
  },
  plugins: [],
}


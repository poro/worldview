/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      colors: {
        cmd: {
          bg: '#0a0a0f',
          panel: '#0d0d14',
          border: '#1a1a2e',
          accent: '#00ff88',
          cyan: '#00e5ff',
          amber: '#ffb300',
          red: '#ff3d3d',
          dim: '#3a3a5c',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      }
    },
  },
  plugins: [],
}

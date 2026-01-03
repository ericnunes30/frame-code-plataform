/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#2b8cee",
        "primary-hover": "#1a7bd9",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "card-dark": "#16202a",
        "surface-dark": "#161e27",
        "surface-darker": "#0d1217",
        "border-dark": "#2a3642",
        "input-bg": "#1c2127",
        "text-muted": "#94a3b8",
        "danger": "#ef4444",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'cursor-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

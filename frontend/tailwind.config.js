/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'surface-active': 'var(--surface-active)',
        border: 'var(--border)',
        'border-focus': 'var(--border-focus)',
        fg: 'var(--fg)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        'accent-dim': 'var(--accent-dim)',
        'accent-glow': 'var(--accent-glow)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
      maxWidth: { reader: '720px' },
      boxShadow: {
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
        'panel': 'var(--shadow-lg)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--accent-glow)' },
          '50%': { boxShadow: '0 0 0 6px transparent' },
        },
      },
    },
  },
}

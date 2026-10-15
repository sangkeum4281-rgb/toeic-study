/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        display: ['Jua', 'Pretendard', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#4a3b3b', soft: '#6e5d5d', mute: '#a8968f' },
        paper: { DEFAULT: '#fff8f0', card: '#ffffff', line: '#f3e4d7' },
        brand: { DEFAULT: '#ff7f9f', dark: '#f0587f', soft: '#ffe6ec' },
        mint: { DEFAULT: '#5cc9a7', soft: '#dcf6ec' },
        sunny: { DEFAULT: '#ffc94d', soft: '#fff3d1' },
        lilac: { DEFAULT: '#a99bff', soft: '#ece8ff' },
        good: '#3dbb8c',
        bad: '#ff6b6b',
      },
      boxShadow: {
        pop: '0 4px 0 0 rgba(74,59,59,0.12)',
        'pop-lg': '0 6px 0 0 rgba(74,59,59,0.12)',
      },
      keyframes: {
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-6deg)' }, '75%': { transform: 'rotate(6deg)' } },
      },
      animation: {
        bob: 'bob 2.4s ease-in-out infinite',
        pop: 'pop .35s ease-out both',
        wiggle: 'wiggle .4s ease-in-out',
      },
    },
  },
  plugins: [],
}

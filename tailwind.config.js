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
        primary: {
          DEFAULT: '#0F62FE',
          dark: '#4589FF',
          hover: '#0043CE',
        },
        success: {
          DEFAULT: '#24A148',
          hover: '#198038',
        },
        warning: {
          DEFAULT: '#F1C21B',
          hover: '#C59A00',
        },
        danger: {
          DEFAULT: '#DA1E28',
          hover: '#A2191F',
        },
        darkbg: {
          DEFAULT: '#121212',
          card: '#1E1E1E',
          border: '#2C2C2C',
        },
        lightbg: {
          DEFAULT: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E0E0E0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

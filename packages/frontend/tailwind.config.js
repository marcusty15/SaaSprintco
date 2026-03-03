/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d0ff',
          300: '#9db0ff',
          400: '#7585ff',
          500: '#5560ff',
          600: '#3c3ef5',
          700: '#322fd8',
          800: '#2a2aae',
          900: '#272a89',
          950: '#181950',
        },
      },
    },
  },
  plugins: [],
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Tajawal', 'sans-serif'] },
      colors: {
        brand: {
          50: '#effcf4',
          100: '#d9fbe5',
          500: '#22a05a',
          600: '#168044',
          700: '#14532d'
        }
      }
    }
  },
  plugins: []
};

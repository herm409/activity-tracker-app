/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        tnv: {
          cyan: '#4cbce4',
          red: '#8b1c1c',
          darkred: '#4a0a0a',
          midred: '#2a0505',
          blackred: '#120000',
        }
      }
    },
  },
  plugins: [],
};

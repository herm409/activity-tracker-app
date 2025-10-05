// tailwind.config.js
module.exports = {
  // In Tailwind CSS v2, 'purge' is used. For v3, this would be 'content'.
  // This tells Tailwind to scan these files for class names.
  purge: [
    './src/**/*.{js,jsx,ts,tsx}', // All component files in the src folder
    './public/index.html',      // The main HTML file
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};

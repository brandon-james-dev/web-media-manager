/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  plugins: [
    require("@tailwindcss/container-queries"),
  ],
};

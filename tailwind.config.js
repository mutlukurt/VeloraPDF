/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        velora: "0 20px 60px rgba(0,0,0,.35)",
        "velora-light": "0 20px 60px rgba(15,15,20,.12)",
      },
    },
  },
  plugins: [],
};

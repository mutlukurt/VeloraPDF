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
        calm: '0 20px 70px rgba(31, 31, 28, 0.10)',
        lift: '0 10px 30px rgba(31, 31, 28, 0.08)',
      },
    },
  },
  plugins: [],
};

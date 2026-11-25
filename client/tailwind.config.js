/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clinicita: {
          teal: "#0D9488",
          "teal-dark": "#0A7A70",
          "teal-soft": "#E0F7F5",
          "teal-bg": "#F4FFFE",
          dark: "#0F2027",
          mid: "#1B4F72",
          accent: "#F59E0B",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
    },
  },
  plugins: [],
};

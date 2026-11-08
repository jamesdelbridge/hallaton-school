import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#22284a",
        gold: "#e31727",
        paper: "#ffffff",
        slate: "#292e42",
        moss: "#a90f1c",
      },
      boxShadow: { soft: "0 18px 55px rgba(27, 44, 60, .09)" },
    },
  },
  plugins: [],
};
export default config;

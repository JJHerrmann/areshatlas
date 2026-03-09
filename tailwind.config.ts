import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f4ecd8",
        ink: "#1c1a16",
        brass: "#9b7a2f",
        verdigris: "#2f6f63",
        lapis: "#355d8b",
      },
      fontFamily: {
        display: ["Garamond", "Georgia", "serif"],
        body: ["Palatino", "Times New Roman", "serif"],
      },
      boxShadow: {
        folio: "0 2px 0 rgba(103, 76, 30, 0.15), 0 10px 30px rgba(53, 39, 15, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss" with { "resolution-mode": "require" };
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class', // 다크 모드 클래스 전략 활성화
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'), // 플러그인 추가
  ],
};
export default config; 
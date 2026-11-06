import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#2f6fa3', dark: '#265b86', soft: '#e7f0f7' },
        sand: '#fbf3db',
        sage: '#e6f0e6',
      },
    },
  },
  plugins: [],
} satisfies Config;
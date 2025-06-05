/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#1a1a1a',
        surface: {
          DEFAULT: '#2a2a2a',
          light: '#3a3a3a',
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        secondary: {
          DEFAULT: '#2a2a2a',
          hover: '#3a3a3a',
        },
        gray: {
          800: '#1f2937',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
        }
      },
      backgroundColor: {
        background: '#1a1a1a',
        surface: '#2a2a2a',
      }
    },
  },
  plugins: [],
} 
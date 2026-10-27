/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2E4D34',
          hover: '#233B27',
          dark: '#243F29',
          darker: '#1B3220',
          light: '#426849',
          tint: '#EAF1EA',
          border: '#D1DDD0',
        },
        cream: {
          DEFAULT: '#FAF7F2',
          surface: '#FFFFFF',
          border: '#EAE5DB',
          muted: '#F4EFE6',
          dark: '#EFE9DC',
        },
        olive: {
          DEFAULT: '#2E4D34',
          50: '#FAF7F2',
          100: '#EAF1EA',
          200: '#C9D9C8',
          300: '#9EB89D',
          400: '#5F8562',
          500: '#2E4D34',
          600: '#25412B',
          700: '#203724',
          800: '#182C1C',
          900: '#112014',
          dark: '#243F29',
          light: '#426849',
        },
        chilly: {
          DEFAULT: '#D82C20',
          hover: '#B51F14',
          light: '#FDECEB',
          surface: '#FFF8F7',
          border: '#FAC7C3',
          dark: '#93180F',
        },
        sage: {
          DEFAULT: '#C4D3C2',
          light: '#E6EDE4',
          tint: '#F0F4EE',
          dark: '#586A56',
        },
        sand: {
          DEFAULT: '#ECDBC2',
          light: '#FAF7F2',
          dark: '#5A4630',
        },
        clay: {
          DEFAULT: '#E2C8B8',
          light: '#F5ECE6',
          dark: '#593B2F',
        },
        charcoal: {
          DEFAULT: '#223B28',
          heading: '#223B28',
          light: '#3A463B',
          muted: '#637365',
        },
        canvas: '#FAF7F2',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Malayalam"', '"Noto Sans Tamil"', '"Noto Sans Devanagari"', '"Noto Sans Kannada"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Pinyon Script"', 'cursive'],
        display: ['"Instrument Sans"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        editorial: ['"Instrument Serif"', 'Georgia', 'serif'],
        marquee: ['"Figtree"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        condensed: ['"Oswald"', '"Arial Narrow"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px 0 rgba(60, 74, 62, 0.05)',
        'card': '0 4px 20px 0 rgba(60, 74, 62, 0.07)',
        'hover': '0 10px 30px 0 rgba(60, 74, 62, 0.12)',
        'card-chilly': '0 4px 20px 0 rgba(216, 44, 32, 0.07)',
        'hover-chilly': '0 10px 30px 0 rgba(216, 44, 32, 0.12)',
      }
    },
  },
  plugins: [],
};

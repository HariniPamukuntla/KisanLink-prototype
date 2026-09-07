/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand greens
        brand: {
          deep: '#166534',
          mid: '#1B8F4A',
          light: '#22C55E',
          soft: '#DCFCE7',
          tint: '#F0FDF4',
        },
        // Market yellow
        market: {
          DEFAULT: '#F59E0B',
          deep: '#B45309',
          soft: '#FEF3C7',
        },
        // Trust blue
        trust: {
          DEFAULT: '#2563EB',
          deep: '#1D4ED8',
          soft: '#DBEAFE',
        },
        // Semantic
        success: '#16A34A',
        warning: '#DC2626',
        caution: '#D97706',
        // Neutrals
        ink: {
          DEFAULT: '#17211A',
          soft: '#647067',
          faint: '#94A39A',
        },
        surface: {
          DEFAULT: '#F7FAF5',
          card: '#FFFFFF',
          alt: '#EFF5EB',
        },
        line: '#E5EBE2',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        deva: ['Noto Sans Devanagari', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(23,33,26,0.06), 0 1px 2px rgba(23,33,26,0.04)',
        'card-hover': '0 8px 24px rgba(23,33,26,0.10), 0 2px 6px rgba(23,33,26,0.06)',
        'brand-glow': '0 8px 28px rgba(22,101,52,0.25)',
        'market-glow': '0 8px 28px rgba(245,158,11,0.30)',
        'trust-glow': '0 8px 28px rgba(37,99,235,0.25)',
        nav: '0 -1px 12px rgba(23,33,26,0.06)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'wave': 'wave 0.8s ease-in-out infinite',
        'rise': 'rise 0.35s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'count-up': 'count-up 1s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(22,101,52,0.35)' },
          '70%': { boxShadow: '0 0 0 18px rgba(22,101,52,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(22,101,52,0)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Windows 11 inspired color system
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        church: {
          primary: '#1e3a8a',
          'primary-light': '#3b82f6',
          secondary: '#f59e0b',
          'secondary-light': '#fbbf24',
          accent: '#84cc16',
          bg: '#fafafa',
        },
        // Glass colors for glassmorphism
        glass: {
          'white-light': 'rgba(255, 255, 255, 0.1)',
          'white': 'rgba(255, 255, 255, 0.2)',
          'white-strong': 'rgba(255, 255, 255, 0.3)',
          'white-heavy': 'rgba(255, 255, 255, 0.4)',
          'black-light': 'rgba(0, 0, 0, 0.1)',
          'black': 'rgba(0, 0, 0, 0.2)',
          'black-strong': 'rgba(0, 0, 0, 0.3)',
          'black-heavy': 'rgba(0, 0, 0, 0.4)',
          // Additional glass colors for borders and highlights
          'border-light': 'rgba(255, 255, 255, 0.2)',
          'border': 'rgba(255, 255, 255, 0.3)',
          'border-strong': 'rgba(255, 255, 255, 0.4)',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'win11': '6px',
        'win11-lg': '8px',
        'win11-xl': '12px',
      },
      boxShadow: {
        'win11': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'win11-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'win11-active': '0 1px 4px rgba(0, 0, 0, 0.2)',
        // Glass shadows
        'glass-sm': '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        'glass-md': '0 4px 16px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        'glass-lg': '0 8px 24px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        'glass-xl': '0 12px 32px rgba(0, 0, 0, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        'glass-2xl': '0 16px 48px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        // Glass animations
        'glass-fade-in': 'glassFadeIn 0.5s glass-smooth',
        'glass-scale-in': 'glassScaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'glass-shimmer': 'glassShimmer 2s infinite',
      },
      backdropBlur: {
        'glass-none': '0px',
        'glass-sm': '4px',
        'glass-md': '8px',
        'glass-lg': '12px',
        'glass-xl': '16px',
        'glass-2xl': '24px',
        'glass-3xl': '32px',
      },
      transitionTimingFunction: {
        // Glass-specific easing functions
        'glass': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'glass-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'glass-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Glass keyframes
        glassFadeIn: {
          '0%': { 
            opacity: '0',
            backdropFilter: 'blur(0px)',
          },
          '100%': { 
            opacity: '1',
            backdropFilter: 'blur(8px)',
          },
        },
        glassScaleIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.8)',
            backdropFilter: 'blur(0px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
            backdropFilter: 'blur(8px)',
          },
        },
        glassShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }
    },
  },
  plugins: [
    // Add backdrop-filter support plugin if needed
    function({ addUtilities, theme }) {
      const backdropFilters = theme('backdropBlur')
      const utilities = {}

      // Generate backdrop-filter utilities if not auto-generated
      Object.entries(backdropFilters).forEach(([key, value]) => {
        utilities[`.backdrop-blur-${key}`] = {
          'backdrop-filter': `blur(${value})`,
          '-webkit-backdrop-filter': `blur(${value})`,
        }
      })

      addUtilities(utilities)
    }
  ],
}

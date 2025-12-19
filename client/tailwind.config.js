/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dark theme impostor colors
                'impostor-dark': {
                    900: '#0a0a0f',
                    800: '#0f0f1a',
                    700: '#15151f',
                    600: '#1a1a2e',
                    500: '#212134',
                },
                'impostor-accent': {
                    neon: '#00d9ff',
                    danger: '#ff0055',
                    warning: '#ffaa00',
                    success: '#00ff88',
                    purple: '#b366ff',
                },
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 217, 255, 0.15)',
                'glow-blue': '0 0 20px rgba(0, 217, 255, 0.5)',
                'glow-red': '0 0 20px rgba(255, 0, 85, 0.5)',
            },
            backdropBlur: {
                'xs': '2px',
            },
        },
    },
    plugins: [],
}

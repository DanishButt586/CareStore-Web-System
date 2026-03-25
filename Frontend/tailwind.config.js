/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                medical: {
                    light: '#e0f2fe', // light blue
                    DEFAULT: '#0ea5e9', // primary blue
                    dark: '#0284c7', // dark blue
                    teal: '#14b8a6', // teal accent
                }
            }
        },
    },
    plugins: [],
}
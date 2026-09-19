import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  experimental: {
    appManifest: false,
  },
  // Entferne hier den typeCheck-Block, falls vorhanden
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

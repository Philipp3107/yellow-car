import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  experimental: {
    appManifest: false,
  },
  runtimeConfig: {
    // Leer lassen! Nuxt holt sich das zur Laufzeit über das NUXT_-Präfix
    myAccessKeyId: '',
    mySecretAccessKey: '',
    myRegion: '',
    s3BucketName: '',
    awsRegion: '', // <--- Neu für DynamoDB
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

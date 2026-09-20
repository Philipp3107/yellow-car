import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  experimental: {
    appManifest: false,
  },
  runtimeConfig: {
    myAccessKeyId: process.env.NUXT_MY_ACCESS_KEY_ID || process.env.MY_ACCESS_KEY_ID,
    mySecretAccessKey: process.env.NUXT_MY_SECRET_ACCESS_KEY || process.env.MY_SECRET_ACCESS_KEY,
    myRegion: process.env.NUXT_MY_REGION || process.env.MY_REGION || 'eu-central-1',
    s3BucketName: process.env.NUXT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

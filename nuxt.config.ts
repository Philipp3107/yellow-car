import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  experimental: {
    appManifest: false,
  },
  runtimeConfig: {
    myAccessKeyId: process.env.MY_ACCESS_KEY_ID,
    mySecretAccessKey: process.env.MY_SECRET_ACCESS_KEY,
    myRegion: process.env.MY_REGION,
    s3BucketName: process.env.S3_BUCKET_NAME,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: '#020617' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
      ],
    },
  },
  experimental: {
    appManifest: false,
  },
  runtimeConfig: {
    myAccessKeyId: process.env.NUXT_MY_ACCESS_KEY_ID || process.env.MY_ACCESS_KEY_ID,
    mySecretAccessKey: process.env.NUXT_MY_SECRET_ACCESS_KEY || process.env.MY_SECRET_ACCESS_KEY,
    myRegion: process.env.NUXT_MY_REGION || process.env.MY_REGION || 'eu-central-1',
    s3BucketName: process.env.NUXT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
    vapidPublicKey: process.env.NUXT_VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.NUXT_VAPID_PRIVATE_KEY,
    vapidSubject: process.env.NUXT_VAPID_SUBJECT || 'mailto:admin@example.com',
    // Teilt Lambda und Nuxt einen Wert, damit /api/push/notify nicht von aussen missbraucht werden kann
    pushSecret: process.env.NUXT_PUSH_SECRET,
    public: {
      vapidPublicKey: process.env.NUXT_VAPID_PUBLIC_KEY,
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

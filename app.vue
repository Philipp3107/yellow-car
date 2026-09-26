<script setup lang="ts">
import Menu from './components/menu/Menu.vue'
import DetectCard from './components/DetectCard.vue'
import PointsCard from './components/PointsCard.vue'
import { VehicleAnalysis, LeaderboardEntry } from './server/interface'
import {onMounted, ref} from "vue";
import ResultCard from "~/components/ResultCard.vue";
import Gallery from "~/components/Gallery.vue";

const DEVICE_ID_STORAGE_KEY = 'yellow-car-device-id'

const activeView = ref(0)

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isUploading = ref(false)
const isAnalyzing = ref(false)
const errorMessage = ref<string | null>(null)

const sightingId = ref<string | null>(null)
const analysisResult = ref<VehicleAnalysis | null>(null)

const userId = ref<string | null>(null)
const displayName = ref<string | null>(null)
const leaderboard = ref<LeaderboardEntry[]>([])
const pushStatus = ref<'idle' | 'unsupported' | 'enabled' | 'denied' | 'error'>('idle')
const pushErrorDetail = ref<string | null>(null)

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId)
  }
  return deviceId
}

async function identifyUser() {
  const deviceId = getOrCreateDeviceId()
  const user = await $fetch<{ userId: string; displayName: string }>('/api/auth/identify', {
    method: 'POST',
    body: { deviceId },
  })
  userId.value = user.userId
  displayName.value = user.displayName
}

async function loadLeaderboard() {
  leaderboard.value = await $fetch<LeaderboardEntry[]>('/api/users')
  console.log(leaderboard.value)
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    pushStatus.value = 'unsupported'
    return
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isIos && !isStandalone) {
    pushStatus.value = 'error'
    pushErrorDetail.value = 'Bitte die App erst zum Home-Bildschirm hinzufügen und von dort aus öffnen.'
    return
  }

  const config = useRuntimeConfig()
  if (!config.public.vapidPublicKey) {
    pushStatus.value = 'error'
    pushErrorDetail.value = 'VAPID Public Key ist nicht konfiguriert (NUXT_VAPID_PUBLIC_KEY in Amplify prüfen).'
    return
  }

  try {
    const permission = Notification.permission
    if (permission === 'default') {
      pushStatus.value = 'idle'
      pushErrorDetail.value = null
      return
    }

    if (permission !== 'granted') {
      pushStatus.value = 'denied'
      pushErrorDetail.value = null
      return
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.public.vapidPublicKey as string),
      })
    }

    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: { deviceId: userId.value, subscription: subscription.toJSON() },
    })

    pushStatus.value = 'enabled'
    pushErrorDetail.value = null
  } catch (err: any) {
    console.error('Fehler beim Aktivieren der Benachrichtigungen:', err)
    pushStatus.value = 'error'
    pushErrorDetail.value = err?.message || String(err)
  }
}

async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    pushStatus.value = 'unsupported'
    return
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      pushStatus.value = 'denied'
      pushErrorDetail.value = null
      return
    }

    await ensurePushSubscription()
  } catch (err: any) {
    console.error('Fehler beim Aktivieren der Benachrichtigungen:', err)
    pushStatus.value = 'error'
    pushErrorDetail.value = err?.message || String(err)
  }
}

onMounted(async () => {
  try {
    await ensurePushSubscription()
    await identifyUser()
    await loadLeaderboard()
  } catch (err) {
    console.error('Fehler beim Identifizieren des Nutzers:', err)
  }
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const selectedFile = target.files[0]
    file.value = selectedFile
    previewUrl.value = URL.createObjectURL(selectedFile)

    // Reset
    analysisResult.value = null
    errorMessage.value = null
  }
}

async function submitSighting() {
  if (!file.value) return
  if (!userId.value) {
    errorMessage.value = 'Nutzer wurde noch nicht erkannt, bitte kurz warten und erneut versuchen.'
    return
  }

  isUploading.value = true
  errorMessage.value = null
  analysisResult.value = null

  try {
    // 1. Presigned S3 URL anfordern
    const { uploadUrl, sightingId: newSightingId } = await $fetch<{ uploadUrl: string; sightingId: string }>('/api/upload-url', {
      method: 'POST',
      body: {
        filename: file.value.name,
        contentType: file.value.type,
        userId: userId.value,
      },
    })

    sightingId.value = newSightingId

    // 2. Foto direkt zu S3 hochladen
    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.value.type,
      },
      body: file.value,
    })

    if (!s3Response.ok) {
      console.log(s3Response)
      console.log(await s3Response.text())
      console.log(s3Response.body)
      throw new Error('Upload zu S3 fehlgeschlagen.')
    }

    isUploading.value = false
    isAnalyzing.value = true

    // 3. Polling starten bis Lambda + Bedrock in DynamoDB geschrieben hat
    await pollForResults(newSightingId, userId.value)
    await loadLeaderboard()

  } catch (err: any) {
    errorMessage.value = err.message || 'Ein Fehler ist aufgetreten.'
    isUploading.value = false
    isAnalyzing.value = false
  }
}

async function pollForResults(id: string, userId: string) {
  // grosszuegig wegen JVM Lambda Cold Start + Bedrock Latenz
  const maxAttempts = 30
  let attempts = 0

  const interval = setInterval(async () => {
    attempts++

    try {
      const data = await $fetch<{ status: string; result?: VehicleAnalysis }>(`/api/sightings/${id}`, {
        query: { userId },
      })

      if (data.status === 'COMPLETED' && data.result) {
        analysisResult.value = data.result
        isAnalyzing.value = false
        clearInterval(interval)
      } else if (attempts >= maxAttempts) {
        errorMessage.value = 'Zeitüberschreitung bei der Analyse.'
        isAnalyzing.value = false
        clearInterval(interval)
      }
    } catch (err) {
      console.error('Polling Fehler:', err)
    }
  }, 1200)
}
</script>
<template>
  <!-- h-[100dvh] und overflow-hidden für den festen Rahmen -->
  <div class="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center p-4 font-sans overflow-hidden box-border">

    <!-- Header bleibt fest oben -->
    <Header :pushStatus="pushStatus" @toggle-push="ensurePushSubscription" />

    <!-- Mittlerer Bereich: flex-1 + min-h-0 + overflow-y-auto -->
    <div class="w-full flex-1 min-h-0 flex flex-col gap-3 items-center p-4 overflow-y-auto">

      <template v-if="activeView === 0">
        <UserCard :userId="displayName" />
        <PointsCard :leaderboard="leaderboard" :userId="userId" />
        <DetectCard
            @file-select="handleFileSelect"
            :previewUrl="previewUrl"
            :file="file"
            :isUploading="isUploading"
            :isAnalyzing="isAnalyzing"
            @submit="submitSighting"
        />
        <ResultCard :analysisResult="analysisResult" />
      </template>

      <template v-if="activeView === 1">
        <PointsCard :leaderboard="leaderboard" :userId="userId" />
        <Gallery :leaderboard="leaderboard" />
      </template>

    </div>

    <!-- Menu bleibt fest unten -->
    <Menu v-model="activeView" />

  </div>
</template>

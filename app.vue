<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Menu from './components/menu/Menu.vue'
import Gallery from './components/Gallery.vue'

interface VehicleAnalysis {
  isCar: boolean
  isYellow: boolean
  isSmart: boolean
  points: number
  description: string
}

interface LeaderboardEntry {
  userId: string
  displayName: string
  totalPoints: number
}

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
}

onMounted(async () => {
  try {
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
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 pb-28 font-sans">

    <main class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">


      <!-- Header -->
      <header class="text-center mb-6">
        <h1 class="text-3xl font-black text-yellow-400 tracking-tight flex items-center justify-center gap-2">
            Gelbe Autos Detector</h1>
        <p class="text-xs text-slate-400 mt-1">Amazon Nova Lite Vision Pipeline</p>
        <p v-if="displayName" class="text-xs text-slate-500 mt-1">Angemeldet als <span class="text-yellow-400 font-semibold">{{ displayName }}</span></p>
      </header>

      <!-- Leaderboard -->
      <div v-if="leaderboard.length" class="mb-6 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Punktestand</p>
        <div class="space-y-2">
          <div
            v-for="entry in leaderboard"
            :key="entry.userId"
            class="flex items-center justify-between text-sm"
            :class="entry.userId === userId ? 'text-yellow-400 font-bold' : 'text-slate-300'"
          >
            <span>{{ entry.displayName }}</span>
            <span>{{ entry.totalPoints }} Punkte</span>
          </div>
        </div>
      </div>

      <template v-if="activeView === 0">
      <!-- Upload Zone -->
      <div class="mb-6">
        <label
          class="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-700 hover:border-yellow-400 rounded-2xl cursor-pointer overflow-hidden transition-all bg-slate-950/50"
        >
          <img
            v-if="previewUrl"
            :src="previewUrl"
            class="w-full h-full object-cover"
            alt="Vorschau"
          />
          <div v-else class="flex flex-col items-center justify-center p-6 text-center">
            <span class="text-4xl mb-3 group-hover:scale-110 transition-transform">📸</span>
            <p class="text-sm font-semibold text-slate-300">Foto aufnehmen oder auswählen</p>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            @change="handleFileSelect"
          />
        </label>
      </div>

      <!-- Button -->
      <button
        :disabled="!file || isUploading || isAnalyzing"
        class="w-full py-4 px-6 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition-all shadow-lg hover:shadow-yellow-400/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg mb-6"
        @click="submitSighting"
      >
        <span v-if="isUploading || isAnalyzing" class="animate-spin text-xl">⏳</span>
        <span>
          <template v-if="isUploading">Upload zu S3...</template>
          <template v-else-if="isAnalyzing">Nova AI analysiert Bild...</template>
          <template v-else>Sighting melden</template>
        </span>
      </button>

      <!-- Status & Error Messages -->
      <p v-if="errorMessage" class="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-sm text-center mb-6">
        ❌ {{ errorMessage }}
      </p>

      <!-- Result Card -->
      <div
        v-if="analysisResult"
        class="bg-slate-950/80 border rounded-2xl p-5 backdrop-blur-sm transition-all"
        :class="analysisResult.isCar && analysisResult.isYellow ? 'border-yellow-400/50 shadow-yellow-400/10 shadow-lg' : 'border-slate-800'"
      >
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Analyse Ergebnis</span>
          <span
            class="px-3 py-1 rounded-full text-xs font-black"
            :class="analysisResult.points > 0 ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
          >
            +{{ analysisResult.points }} Punkte
          </span>
        </div>

        <div class="space-y-2 mb-4 text-sm">
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60">
            <span class="text-slate-400">Auto erkannt:</span>
            <span class="font-bold">{{ analysisResult.isCar ? '✅ Ja' : '❌ Nein' }}</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60">
            <span class="text-slate-400">Farbe Gelb:</span>
            <span class="font-bold">{{ analysisResult.isYellow ? '🟡 Ja' : '❌ Nein' }}</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60">
            <span class="text-slate-400">Smart / Microcar:</span>
            <span class="font-bold">{{ analysisResult.isSmart ? '🚗 Ja (Bonus!)' : 'Nein' }}</span>
          </div>
        </div>

        <p class="text-xs text-slate-400 italic bg-slate-900/40 p-3 rounded-lg border border-slate-800">
          "{{ analysisResult.description }}"
        </p>
      </div>
      </template>

      <Gallery v-else :leaderboard="leaderboard" />

    </main>
  </div>

  <div class="fixed bottom-6 left-0 right-0 flex justify-center z-50">
    <Menu v-model="activeView" />
  </div>
</template>

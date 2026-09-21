<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface SightingItem {
  eventId: string
  userId: string
  imageUrl: string | null
  points: number
  isCar: boolean
  isYellow: boolean
  isSmart: boolean
  description: string
  timestamp: string
}

interface LeaderboardEntry {
  userId: string
  displayName: string
  totalPoints: number
}

const props = defineProps<{ leaderboard: LeaderboardEntry[] }>()

const sightings = ref<SightingItem[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

function nameFor(userId: string) {
  return props.leaderboard.find((entry) => entry.userId === userId)?.displayName || userId
}

onMounted(async () => {
  try {
    sightings.value = await $fetch<SightingItem[]>('/api/sightings')
  } catch (err) {
    errorMessage.value = 'Galerie konnte nicht geladen werden.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="space-y-3">
    <p v-if="isLoading" class="text-center text-sm text-slate-400 py-8">Lade Galerie...</p>
    <p v-else-if="errorMessage" class="text-center text-sm text-rose-400 py-8">{{ errorMessage }}</p>
    <p v-else-if="!sightings.length" class="text-center text-sm text-slate-400 py-8">Noch keine Sichtungen gemeldet.</p>

    <div
      v-for="item in sightings"
      :key="item.eventId"
      class="flex gap-3 bg-slate-950/50 border border-slate-800 rounded-2xl p-3"
    >
      <img
        v-if="item.imageUrl"
        :src="item.imageUrl"
        class="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        alt="Sichtung"
      />
      <div v-else class="w-20 h-20 rounded-xl bg-slate-900 flex-shrink-0 flex items-center justify-center text-2xl">📷</div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1 gap-2">
          <span class="text-xs font-semibold text-slate-300 truncate">{{ nameFor(item.userId) }}</span>
          <span
            class="px-2 py-0.5 rounded-full text-xs font-black flex-shrink-0"
            :class="item.points > 0 ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
          >
            +{{ item.points }}
          </span>
        </div>
        <p class="text-xs text-slate-500 line-clamp-2">{{ item.description }}</p>
      </div>
    </div>
  </div>
</template>

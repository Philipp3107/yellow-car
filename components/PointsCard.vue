<script setup lang="ts">
import { LeaderboardEntry } from '../server/interface'

import { RefreshCcw } from 'lucide-vue-next';

// Korrigiert: leaderborad -> leaderboard
const props = defineProps<{
  leaderboard: LeaderboardEntry[]
  userId: string | null
  reloadLeaderboard: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const sortedLeaderboard = computed(() => {
  return [...props.leaderboard].sort((a, b) => b.totalPoints - a.totalPoints)
})

</script>

<template>
  <div class="bg-slate-800 p-4 rounded-lg w-full">
    <div class="m-2">
        <div class="flex justify-between">
            <p class="text-slate-500 text-sm">Punktestand</p>
            <button @click="emit('refresh')">
<RefreshCcw :class="[props.reloadLeaderboard ? 'animate-[spin_1s_linear_infinite_reverse]' : 'text-slate-500']"/>            </button>
        </div>

      <div v-for="person in sortedLeaderboard" :key="person.id" class="flex justify-between" :class="[userId == person.userId ? 'text-yellow-400 text-sm font-bold' : 'text-slate-300 text-sm']">
        <p>{{ person.displayName }}</p>
        <p>{{ person.totalPoints }} Punkte</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LeaderboardEntry } from '../server/interface'

// Korrigiert: leaderborad -> leaderboard
const props = defineProps<{
  leaderboard: LeaderboardEntry[]
  userId: string | null
}>()

const sortedLeaderboard = computed(() => {
  return [...props.leaderboard].sort((a, b) => b.totalPoints - a.totalPoints)
})

</script>

<template>
  <div class="bg-slate-800 p-4 rounded-lg w-full">
    <div class="m-2">
      <p class="text-slate-500 text-sm">Punktestand</p>
      <div v-for="person in sortedLeaderboard" :key="person.id" class="flex justify-between" :class="[userId == person.userId ? 'text-yellow-400 text-sm font-bold' : 'text-slate-300 text-sm']">
        <p>{{ person.displayName }}</p>
        <p>{{ person.totalPoints }} Punkte</p>
      </div>
    </div>
  </div>
</template>
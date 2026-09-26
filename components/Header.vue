<script setup lang="ts">
import { Bell } from 'lucide-vue-next'

// Definieren, welche Props reinkommen und welches Event rausgeht
defineProps<{
  pushStatus: string
}>()

const emit = defineEmits<{
  (e: 'toggle-push'): void
}>()
</script>

<template>
  <header class="w-full p-2 rounded-full border border-white/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.08] backdrop-blur-xl backdrop-saturate-[1.8] shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.8),0_10px_30px_rgba(0,0,0,0.05)] dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.2)]">
    <div class="flex justify-between w-full">
      <p class="text-yellow-400 font-bold text-xl">Gelbe Autos</p>
      <button @click="emit('toggle-push')">
        <Bell :class="pushStatus === 'enabled' ? 'text-yellow-400' : 'text-slate-100'" />
      </button>
    </div>
  </header>
</template>
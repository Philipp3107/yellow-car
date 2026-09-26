<script setup lang="ts">

import type VehicleAnalysis from "#server/interface/VehicleAnalysis";

defineProps<{
  analysisResult: VehicleAnalysis | null
}>()
</script>

<template>

  <div v-if="analysisResult">
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
  </div>
</template>
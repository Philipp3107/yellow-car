<script setup lang="ts">

defineProps<{
  previewUrl: string | null
  file: File | null
  isUploading: boolean
  isAnalyzing: boolean

}>()

const emit = defineEmits<{
  (e: 'file-select', event: Event): void
  (e: 'submit'): void
}>()

</script>

<template>
  <div class="bg-slate-800 p-4 rounded-lg w-full text-center">
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
            @change="emit('file-select', $event)"
        />
      </label>
    </div>

    <button
        class="bg-yellow-400 w-full py-4 text-black  font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!file || isUploading || isAnalyzing"
        @click="emit('submit')"
    >
      <span v-if="isUploading || isAnalyzing" class="animate-spin text-xl">⏳</span>
      <span>
          <template v-if="isUploading">Upload zu S3...</template>
          <template v-else-if="isAnalyzing">Nova AI analysiert Bild...</template>
          <template v-else>Sighting melden</template>
        </span>
    </button>
  </div>
</template>
<script setup lang="ts">

const props = defineProps<{
    userId: string | null
}>()

</script>
<template>
  <div class="bg-slate-800 p-4 rounded-lg w-full text-center">
    <p class="text-slate-500 text-sm">Amazon Nova Lite Vision Pipeline</p>
    <p class="text-sm">Angemeldet als <span class="font-bold text-yellow-400">{{ props.userId }}</span></p>
  </div>
</template>

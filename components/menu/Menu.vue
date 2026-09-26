<template>
  <nav class="flex w-fit mx-auto gap-2 p-2 rounded-full border border-white/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.08] backdrop-blur-xl backdrop-saturate-[1.8] shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.8),0_10px_30px_rgba(0,0,0,0.05)] dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.2)]">
    <MenuItem
      v-for="(item, index) in items"
      :key="item.label"
      :icon="item.icon"
      @click="select(index)"
      :class="[
        modelValue === index
          ? 'text-black dark:text-white bg-white/80 dark:bg-white/[0.18] shadow-[0_4px_12px_rgba(0,0,0,0.1)] [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.1)]'
          : 'text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
      ]"
    />
  </nav>
</template>

<script setup>
import { Car, Image, Quote } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
})
const emit = defineEmits(['update:modelValue'])

const items = [
  { label: 'Melden', icon: Car },
  { label: 'Galerie', icon: Image },
  { label: 'Quotes', icon: Quote },
]

function select(index) {
  emit('update:modelValue', index)
}
</script>

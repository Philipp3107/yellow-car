<script setup>
import * as lucide from 'lucide-vue-next'
defineProps({
  icon: {
    type: lucide.LucideIcon,
  }
})
</script>
<template>
  <div class="menu-item 'flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer select-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]'" >
    <component :is="icon" class="w-5 h-5" />
  </div>
</template>

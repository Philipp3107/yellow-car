<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Media, MediaType, Quote } from '../server/interface'

const props = defineProps<{ userId: string | null }>()

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  SERIES: 'Serie',
  MOVIE: 'Film',
  BOOK: 'Buch',
  GAME: 'Spiel',
  OTHER: 'Sonstiges',
}

const quotes = ref<Quote[]>([])
const media = ref<Media[]>([])
const search = ref('')
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const showForm = ref(false)
const isSaving = ref(false)
const formError = ref<string | null>(null)
const text = ref('')
const speaker = ref('')
const location = ref('')
const mediaQuery = ref('')
const selectedMedia = ref<Media | null>(null)
const newMediaType = ref<MediaType>('SERIES')

const mediaSuggestions = computed(() => {
  const q = mediaQuery.value.trim().toLowerCase()
  if (!q || selectedMedia.value) return []
  return media.value.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 5)
})

const canCreateMedia = computed(() => {
  const q = mediaQuery.value.trim().toLowerCase()
  return !!q && !selectedMedia.value && !media.value.some((m) => m.title.toLowerCase() === q)
})

async function loadQuotes() {
  try {
    quotes.value = await $fetch<Quote[]>('/api/quotes', { query: { q: search.value || undefined } })
    errorMessage.value = null
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Zitate konnten nicht geladen werden.'
  } finally {
    isLoading.value = false
  }
}

async function loadMedia() {
  media.value = await $fetch<Media[]>('/api/media')
}

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadQuotes, 300)
})

onMounted(async () => {
  await Promise.all([loadQuotes(), loadMedia().catch((err) => console.error(err))])
})

function selectMedia(m: Media) {
  selectedMedia.value = m
  mediaQuery.value = m.title
}

function clearMedia() {
  selectedMedia.value = null
  mediaQuery.value = ''
}

async function createMedia() {
  const created = await $fetch<Media>('/api/media', {
    method: 'POST',
    body: { title: mediaQuery.value.trim(), mediaType: newMediaType.value, userId: props.userId },
  })
  if (!media.value.some((m) => m.mediaId === created.mediaId)) {
    media.value.push(created)
  }
  selectMedia(created)
}

function resetForm() {
  text.value = ''
  speaker.value = ''
  location.value = ''
  clearMedia()
  formError.value = null
}

async function submitQuote() {
  if (!props.userId) {
    formError.value = 'Nutzer wurde noch nicht erkannt, bitte kurz warten.'
    return
  }
  if (!text.value.trim()) {
    formError.value = 'Bitte ein Zitat eingeben.'
    return
  }

  isSaving.value = true
  formError.value = null
  try {
    if (canCreateMedia.value) {
      await createMedia()
    }
    const quote = await $fetch<Quote>('/api/quotes', {
      method: 'POST',
      body: {
        userId: props.userId,
        text: text.value,
        speaker: speaker.value,
        location: location.value,
        mediaId: selectedMedia.value?.mediaId,
      },
    })
    quotes.value.unshift(quote)
    resetForm()
    showForm.value = false
  } catch (err: any) {
    console.error(err)
    formError.value = err?.data?.statusMessage || 'Zitat konnte nicht gespeichert werden.'
  } finally {
    isSaving.value = false
  }
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''
}
</script>

<template>
  <div class="w-full space-y-3">
    <div class="flex gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Zitate durchsuchen..."
        class="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
      />
      <button
        class="px-3 py-2 rounded-xl text-sm font-bold flex-shrink-0"
        :class="showForm ? 'bg-slate-800 text-slate-300' : 'bg-yellow-400 text-slate-950'"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Abbrechen' : '+ Zitat' }}
      </button>
    </div>

    <form v-if="showForm" class="bg-slate-800 p-4 rounded-lg space-y-3" @submit.prevent="submitQuote">
      <textarea
        v-model="text"
        rows="3"
        maxlength="1000"
        placeholder="Was wurde gesagt?"
        class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
      />
      <input
        v-model="speaker"
        maxlength="100"
        placeholder="Wer hat's gesagt? (optional)"
        class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
      />

      <div class="relative">
        <div class="flex gap-2">
          <input
            v-model="mediaQuery"
            :readonly="!!selectedMedia"
            maxlength="200"
            placeholder="Serie / Film / Buch (optional)"
            class="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            :class="selectedMedia ? 'text-yellow-400' : ''"
          />
          <button v-if="selectedMedia" type="button" class="px-3 rounded-xl bg-slate-900 text-slate-400 text-sm" @click="clearMedia">✕</button>
        </div>

        <ul v-if="mediaSuggestions.length" class="mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <li
            v-for="m in mediaSuggestions"
            :key="m.mediaId"
            class="px-3 py-2 text-sm flex justify-between cursor-pointer hover:bg-slate-800"
            @click="selectMedia(m)"
          >
            <span class="truncate">{{ m.title }}</span>
            <span class="text-xs text-slate-500 flex-shrink-0 ml-2">{{ MEDIA_TYPE_LABELS[m.mediaType] }}</span>
          </li>
        </ul>

        <div v-if="canCreateMedia" class="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span class="flex-1">„{{ mediaQuery.trim() }}" wird neu angelegt als</span>
          <select v-model="newMediaType" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200">
            <option v-for="(label, type) in MEDIA_TYPE_LABELS" :key="type" :value="type">{{ label }}</option>
          </select>
        </div>
      </div>

      <input
        v-if="mediaQuery.trim()"
        v-model="location"
        maxlength="100"
        placeholder="Stelle, z.B. S02E05 12:34 oder Seite 87 (optional)"
        class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
      />

      <p v-if="formError" class="text-xs text-rose-400">{{ formError }}</p>

      <button
        type="submit"
        :disabled="isSaving"
        class="w-full py-2 rounded-xl bg-yellow-400 text-slate-950 font-bold text-sm disabled:opacity-50"
      >
        {{ isSaving ? 'Speichere...' : 'Zitat speichern' }}
      </button>
    </form>

    <p v-if="isLoading" class="text-center text-sm text-slate-400 py-8">Lade Zitate...</p>
    <p v-else-if="errorMessage" class="text-center text-sm text-rose-400 py-8">{{ errorMessage }}</p>
    <p v-else-if="!quotes.length" class="text-center text-sm text-slate-400 py-8">
      {{ search ? 'Keine Zitate gefunden.' : 'Noch keine Zitate angelegt.' }}
    </p>

    <div
      v-for="quote in quotes"
      :key="quote.quoteId"
      class="bg-slate-950/50 border border-slate-800 rounded-2xl p-3"
    >
      <p class="text-sm text-slate-100 whitespace-pre-line">„{{ quote.text }}"</p>
      <p v-if="quote.speaker" class="text-xs text-slate-400 mt-1">– {{ quote.speaker }}</p>
      <div class="flex items-center justify-between mt-2 gap-2 text-xs text-slate-500">
        <span class="truncate">
          <template v-if="quote.mediaTitle">
            <span class="text-yellow-400">{{ quote.mediaTitle }}</span>
            <span v-if="quote.location"> · {{ quote.location }}</span>
          </template>
        </span>
        <span class="flex-shrink-0">{{ quote.displayName }} · {{ formatDate(quote.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

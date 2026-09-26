<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Collection, CollectionItem } from '../server/interface'

const props = defineProps<{
  userId: string | null
  sharedUrl: string | null
  openCollectionId: string | null
}>()
const emit = defineEmits<{ (e: 'share-done'): void }>()

const collections = ref<Collection[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const activeCollection = ref<Collection | null>(null)
const activeItems = ref<CollectionItem[]>([])
const isLoadingItems = ref(false)

const newCollectionName = ref('')
const note = ref('')
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const showIosHelp = ref(false)

const origin = computed(() => (import.meta.client ? window.location.origin : ''))

async function loadCollections() {
  try {
    collections.value = await $fetch<Collection[]>('/api/collections')
    errorMessage.value = null
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Collections konnten nicht geladen werden.'
  } finally {
    isLoading.value = false
  }
}

async function openCollection(collectionId: string) {
  isLoadingItems.value = true
  try {
    const data = await $fetch<{ collection: Collection; items: CollectionItem[] }>(`/api/collections/${encodeURIComponent(collectionId)}`)
    activeCollection.value = data.collection
    activeItems.value = data.items
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Collection konnte nicht geladen werden.'
  } finally {
    isLoadingItems.value = false
  }
}

async function createCollection() {
  if (!newCollectionName.value.trim() || !props.userId) return
  try {
    const created = await $fetch<Collection>('/api/collections', {
      method: 'POST',
      body: { name: newCollectionName.value, userId: props.userId },
    })
    if (!collections.value.some((c) => c.collectionId === created.collectionId)) {
      collections.value.unshift(created)
    }
    newCollectionName.value = ''
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Collection konnte nicht angelegt werden.'
  }
}

async function saveShared(target: { collectionId?: string; collectionName?: string }) {
  if (!props.sharedUrl) return
  if (!props.userId) {
    saveError.value = 'Nutzer wurde noch nicht erkannt, bitte kurz warten.'
    return
  }

  isSaving.value = true
  saveError.value = null
  try {
    const { collection } = await $fetch<{ collection: Collection; item: CollectionItem }>('/api/collections/items', {
      method: 'POST',
      body: { userId: props.userId, url: props.sharedUrl, note: note.value, ...target },
    })
    note.value = ''
    newCollectionName.value = ''
    emit('share-done')
    await loadCollections()
    await openCollection(collection.collectionId)
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    isSaving.value = false
  }
}

function cancelShare() {
  note.value = ''
  saveError.value = null
  emit('share-done')
}

function linkLabel(url: string) {
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname.endsWith('instagram.com')) {
      if (pathname.startsWith('/reel')) return '🎬 Instagram Reel'
      if (pathname.startsWith('/p/')) return '🖼️ Instagram Post'
      return '📸 Instagram'
    }
    return `🔗 ${hostname.replace(/^www\./, '')}`
  } catch {
    return '🔗 Link'
  }
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''
}

async function copyUserId() {
  if (props.userId) await navigator.clipboard.writeText(props.userId)
}

watch(() => props.openCollectionId, (id) => {
  if (id) openCollection(id)
}, { immediate: true })

onMounted(loadCollections)
</script>

<template>
  <div class="w-full space-y-3">
    <!-- Share-Dialog: kommt ueber Android Share-Target oder ?share_url= -->
    <div v-if="sharedUrl" class="bg-slate-800 p-4 rounded-lg space-y-3 border border-yellow-400/40">
      <p class="text-sm font-bold text-yellow-400">Zu welcher Collection hinzufügen?</p>
      <p class="text-xs text-slate-400 break-all">{{ linkLabel(sharedUrl) }} · {{ sharedUrl }}</p>

      <input
        v-model="note"
        maxlength="500"
        placeholder="Notiz (optional)"
        class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
      />

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="c in collections"
          :key="c.collectionId"
          :disabled="isSaving"
          class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-left truncate hover:border-yellow-400 disabled:opacity-50"
          @click="saveShared({ collectionId: c.collectionId })"
        >
          {{ c.name }}
        </button>
      </div>

      <form class="flex gap-2" @submit.prevent="saveShared({ collectionName: newCollectionName })">
        <input
          v-model="newCollectionName"
          maxlength="80"
          placeholder="Neue Collection..."
          class="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
        />
        <button
          type="submit"
          :disabled="isSaving || !newCollectionName.trim()"
          class="px-3 py-2 rounded-xl bg-yellow-400 text-slate-950 font-bold text-sm disabled:opacity-50"
        >
          Anlegen
        </button>
      </form>

      <p v-if="saveError" class="text-xs text-rose-400">{{ saveError }}</p>
      <button class="w-full text-xs text-slate-500" @click="cancelShare">Abbrechen</button>
    </div>

    <!-- Detailansicht -->
    <template v-else-if="activeCollection">
      <div class="flex items-center gap-2">
        <button class="px-3 py-2 rounded-xl bg-slate-800 text-sm" @click="activeCollection = null">←</button>
        <p class="flex-1 font-bold truncate">{{ activeCollection.name }}</p>
        <span class="text-xs text-slate-500">{{ activeItems.length }} Einträge</span>
      </div>

      <p v-if="!activeItems.length" class="text-center text-sm text-slate-400 py-8">Noch nichts gespeichert.</p>

      <a
        v-for="item in activeItems"
        :key="item.itemId"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block bg-slate-950/50 border border-slate-800 rounded-2xl p-3 hover:border-yellow-400"
      >
        <p class="text-sm font-semibold">{{ linkLabel(item.url) }}</p>
        <p v-if="item.note" class="text-sm text-slate-300 mt-1">{{ item.note }}</p>
        <p class="text-xs text-slate-500 mt-2">{{ item.displayName }} · {{ formatDate(item.createdAt) }}</p>
      </a>
    </template>

    <!-- Uebersicht -->
    <template v-else>
      <form class="flex gap-2" @submit.prevent="createCollection">
        <input
          v-model="newCollectionName"
          maxlength="80"
          placeholder="Neue Collection..."
          class="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-400"
        />
        <button
          type="submit"
          :disabled="!newCollectionName.trim()"
          class="px-3 py-2 rounded-xl bg-yellow-400 text-slate-950 font-bold text-sm disabled:opacity-50"
        >
          +
        </button>
      </form>

      <p v-if="isLoading || isLoadingItems" class="text-center text-sm text-slate-400 py-8">Lade...</p>
      <p v-else-if="errorMessage" class="text-center text-sm text-rose-400 py-8">{{ errorMessage }}</p>
      <p v-else-if="!collections.length" class="text-center text-sm text-slate-400 py-8">
        Noch keine Collections. Teile ein Instagram-Video mit der App oder leg oben eine an.
      </p>

      <button
        v-for="c in collections"
        :key="c.collectionId"
        class="w-full flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-left hover:border-yellow-400"
        @click="openCollection(c.collectionId)"
      >
        <span class="font-semibold truncate">📁 {{ c.name }}</span>
        <span class="text-xs text-slate-500 flex-shrink-0 ml-2">{{ c.itemCount }} · {{ formatDate(c.lastAddedAt || c.createdAt) }}</span>
      </button>

      <div class="pt-4">
        <button class="text-xs text-slate-500 underline" @click="showIosHelp = !showIosHelp">iOS-Kurzbefehl einrichten</button>
        <div v-if="showIosHelp" class="mt-2 bg-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-2">
          <p>Für den Kurzbefehl brauchst du deine Nutzer-ID und die API-Adresse. Die ID nicht weitergeben – damit kann man in deinem Namen speichern.</p>
          <p class="break-all"><span class="text-slate-500">API:</span> {{ origin }}/api/collections</p>
          <button class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700" @click="copyUserId">Nutzer-ID kopieren</button>
        </div>
      </div>
    </template>
  </div>
</template>

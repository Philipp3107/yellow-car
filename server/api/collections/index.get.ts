import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const collections = await listCollections()
  // ?names=1 liefert nur die Namen, damit der iOS-Kurzbefehl direkt "Aus Liste auswählen" nutzen kann
  return getQuery(event).names ? collections.map((c) => c.name) : collections
})

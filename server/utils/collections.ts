import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createError } from 'h3'
import type { Collection } from '../interface'

export const COLLECTIONS_TABLE = 'Collections'
export const COLLECTION_META_KEY = 'META'

export function toCollection(item: Record<string, any>): Collection {
  return {
    collectionId: item.collectionId,
    name: item.name,
    createdBy: item.createdBy || '',
    createdAt: item.createdAt || '',
    itemCount: Number(item.itemCount) || 0,
    lastAddedAt: item.lastAddedAt || null,
  }
}

export async function listCollections(): Promise<Collection[]> {
  const docClient = createDynamoClient()
  const items: Record<string, any>[] = []
  let lastKey: Record<string, any> | undefined
  do {
    const page = await docClient.send(new ScanCommand({
      TableName: COLLECTIONS_TABLE,
      FilterExpression: 'itemKey = :meta',
      ExpressionAttributeValues: { ':meta': COLLECTION_META_KEY },
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(page.Items || []))
    lastKey = page.LastEvaluatedKey
  } while (lastKey)

  return items
    .map(toCollection)
    .sort((a, b) => (b.lastAddedAt || b.createdAt).localeCompare(a.lastAddedAt || a.createdAt))
}

export function cleanCollectionName(value: unknown) {
  const name = typeof value === 'string' ? value.trim().slice(0, 80) : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Collection-Name fehlt' })
  }
  return name
}

export async function findOrCreateCollection(name: string, userId: string) {
  const existing = (await listCollections()).find((c) => c.name.toLowerCase() === name.toLowerCase())
  if (existing) return { collection: existing, created: false }

  const collection: Collection = {
    collectionId: crypto.randomUUID(),
    name,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    itemCount: 0,
    lastAddedAt: null,
  }
  await createDynamoClient().send(new PutCommand({
    TableName: COLLECTIONS_TABLE,
    Item: { ...collection, itemKey: COLLECTION_META_KEY },
  }))
  return { collection, created: true }
}

// Instagram teilt z.B. "Schau dir diesen Reel an https://www.instagram.com/reel/XYZ/?igsh=abc"
export function extractShareUrl(value: unknown) {
  const match = typeof value === 'string' ? value.match(/https?:\/\/\S+/) : null
  if (!match) return null

  try {
    const url = new URL(match[0])
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    url.hash = ''
    if (url.hostname.endsWith('instagram.com')) {
      url.search = ''
    }
    return url.toString()
  } catch {
    return null
  }
}

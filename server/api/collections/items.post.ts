import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError } from 'h3'
import type { Collection, CollectionItem } from '../../interface'

// Body: { userId, url, note?, collectionId? | collectionName? } – collectionName legt bei Bedarf neu an
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await requireUser(typeof body?.userId === 'string' ? body.userId : '')

  const url = extractShareUrl(body?.url)
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Kein gültiger Link gefunden' })
  }
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : ''

  const docClient = createDynamoClient()

  let collection: Collection
  if (typeof body?.collectionId === 'string' && body.collectionId) {
    const meta = await docClient.send(new GetCommand({
      TableName: COLLECTIONS_TABLE,
      Key: { collectionId: body.collectionId, itemKey: COLLECTION_META_KEY },
    }))
    if (!meta.Item) {
      throw createError({ statusCode: 404, statusMessage: 'Collection nicht gefunden' })
    }
    collection = toCollection(meta.Item)
  } else {
    collection = (await findOrCreateCollection(cleanCollectionName(body?.collectionName), user.userId)).collection
  }

  const existing = await docClient.send(new QueryCommand({
    TableName: COLLECTIONS_TABLE,
    KeyConditionExpression: 'collectionId = :id AND begins_with(itemKey, :prefix)',
    FilterExpression: '#url = :url',
    ExpressionAttributeNames: { '#url': 'url' },
    ExpressionAttributeValues: { ':id': collection.collectionId, ':prefix': 'ITEM#', ':url': url },
  }))
  if (existing.Items?.length) {
    throw createError({ statusCode: 409, statusMessage: `Schon in „${collection.name}" gespeichert` })
  }

  const item: CollectionItem = {
    itemId: crypto.randomUUID(),
    collectionId: collection.collectionId,
    url,
    note,
    userId: user.userId,
    displayName: user.displayName,
    createdAt: new Date().toISOString(),
  }

  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: COLLECTIONS_TABLE,
          Item: { ...item, itemKey: `ITEM#${item.createdAt}#${item.itemId}` },
        },
      },
      {
        Update: {
          TableName: COLLECTIONS_TABLE,
          Key: { collectionId: collection.collectionId, itemKey: COLLECTION_META_KEY },
          UpdateExpression: 'ADD itemCount :one SET lastAddedAt = :now',
          ExpressionAttributeValues: { ':one': 1, ':now': item.createdAt },
        },
      },
    ],
  }))

  try {
    await sendPushToOthers(user.userId, {
      title: `📌 ${user.displayName} hat etwas in „${collection.name}" gespeichert`,
      body: note || url,
      url: `/?collection=${encodeURIComponent(collection.collectionId)}`,
    })
  } catch (err) {
    console.error('Push fuer Collection-Eintrag fehlgeschlagen:', err)
  }

  return { collection: { ...collection, itemCount: collection.itemCount + 1, lastAddedAt: item.createdAt }, item }
})

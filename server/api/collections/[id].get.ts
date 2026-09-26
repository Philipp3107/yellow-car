import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import type { CollectionItem } from '../../interface'

export default defineEventHandler(async (event) => {
  const collectionId = getRouterParam(event, 'id') || ''
  const docClient = createDynamoClient()

  const items: Record<string, any>[] = []
  let lastKey: Record<string, any> | undefined
  do {
    const page = await docClient.send(new QueryCommand({
      TableName: COLLECTIONS_TABLE,
      KeyConditionExpression: 'collectionId = :id',
      ExpressionAttributeValues: { ':id': collectionId },
      ScanIndexForward: false,
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(page.Items || []))
    lastKey = page.LastEvaluatedKey
  } while (lastKey)

  const meta = items.find((item) => item.itemKey === COLLECTION_META_KEY)
  if (!meta) {
    throw createError({ statusCode: 404, statusMessage: 'Collection nicht gefunden' })
  }

  const entries: CollectionItem[] = items
    .filter((item) => item.itemKey !== COLLECTION_META_KEY)
    .map((item) => ({
      itemId: item.itemId,
      collectionId: item.collectionId,
      url: item.url,
      note: item.note || '',
      userId: item.userId,
      displayName: item.displayName || item.userId,
      createdAt: item.createdAt || '',
    }))

  return { collection: toCollection(meta), items: entries }
})

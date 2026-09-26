import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, getQuery } from 'h3'
import type { Quote } from '../../interface'

export default defineEventHandler(async (event) => {
  const { q, userId, mediaId } = getQuery(event)
  const search = typeof q === 'string' ? q.trim().toLowerCase() : ''
  const docClient = createDynamoClient()

  const items: Record<string, any>[] = []
  let lastKey: Record<string, any> | undefined
  do {
    // Mit userId gezielt per Partition-Key abfragen, sonst die ganze Tabelle scannen
    const page = typeof userId === 'string' && userId
      ? await docClient.send(new QueryCommand({
          TableName: 'Quotes',
          KeyConditionExpression: 'userId = :uid',
          ExpressionAttributeValues: { ':uid': userId },
          ExclusiveStartKey: lastKey,
        }))
      : await docClient.send(new ScanCommand({ TableName: 'Quotes', ExclusiveStartKey: lastKey }))
    items.push(...(page.Items || []))
    lastKey = page.LastEvaluatedKey
  } while (lastKey)

  const quotes: Quote[] = items.map((item) => ({
    quoteId: item.quoteId,
    userId: item.userId,
    displayName: item.displayName || item.userId,
    text: item.text || '',
    speaker: item.speaker || '',
    mediaId: item.mediaId || null,
    mediaTitle: item.mediaTitle || null,
    location: item.location || '',
    createdAt: item.createdAt || '',
  }))

  return quotes
    .filter((quote) => (typeof mediaId === 'string' && mediaId ? quote.mediaId === mediaId : true))
    .filter((quote) => !search || [quote.text, quote.speaker, quote.mediaTitle || '', quote.displayName, quote.location]
      .some((field) => field.toLowerCase().includes(search)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

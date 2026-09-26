import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, getQuery } from 'h3'
import type { Media } from '../../interface'

export default defineEventHandler(async (event) => {
  const { q, type } = getQuery(event)
  const search = typeof q === 'string' ? q.trim().toLowerCase() : ''
  const docClient = createDynamoClient()

  const items: Record<string, any>[] = []
  let lastKey: Record<string, any> | undefined
  do {
    const page = await docClient.send(new ScanCommand({
      TableName: 'MediaCatalog',
      FilterExpression: 'entityKey = :meta',
      ExpressionAttributeValues: { ':meta': MEDIA_META_KEY },
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(page.Items || []))
    lastKey = page.LastEvaluatedKey
  } while (lastKey)

  const media: Media[] = items.map((item) => ({
    mediaId: item.mediaId,
    mediaType: item.mediaType,
    title: item.title,
    createdBy: item.createdBy || '',
    createdAt: item.createdAt || '',
  }))

  return media
    .filter((m) => (typeof type === 'string' && type ? m.mediaType === type : true))
    .filter((m) => (search ? m.title.toLowerCase().includes(search) : true))
    .sort((a, b) => a.title.localeCompare(b.title))
})

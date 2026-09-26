import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError } from 'h3'
import type { Media, MediaType } from '../../interface'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const mediaType = body?.mediaType as MediaType
  const userId = typeof body?.userId === 'string' ? body.userId : ''

  if (!title || title.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'title is required (max 200 chars)' })
  }
  if (!MEDIA_TYPES.includes(mediaType)) {
    throw createError({ statusCode: 400, statusMessage: `mediaType must be one of ${MEDIA_TYPES.join(', ')}` })
  }
  await requireUser(userId)

  const docClient = createDynamoClient()

  const existing = await docClient.send(new QueryCommand({
    TableName: 'MediaCatalog',
    IndexName: 'MediaTypeTitleIndex',
    KeyConditionExpression: 'mediaType = :type AND title = :title',
    ExpressionAttributeValues: { ':type': mediaType, ':title': title },
  }))
  const duplicate = existing.Items?.find((item) => item.entityKey === MEDIA_META_KEY)
  if (duplicate) {
    return duplicate as Media
  }

  const media: Media = {
    mediaId: crypto.randomUUID(),
    mediaType,
    title,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  }

  await docClient.send(new PutCommand({
    TableName: 'MediaCatalog',
    Item: { ...media, entityKey: MEDIA_META_KEY },
  }))

  return media
})

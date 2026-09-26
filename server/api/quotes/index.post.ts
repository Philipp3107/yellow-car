import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError } from 'h3'
import type { Quote } from '../../interface'

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const text = cleanString(body?.text, 1000)
  const speaker = cleanString(body?.speaker, 100)
  const location = cleanString(body?.location, 100)
  const mediaId = cleanString(body?.mediaId, 100)

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const user = await requireUser(cleanString(body?.userId, 100))
  const docClient = createDynamoClient()

  let mediaTitle: string | null = null
  if (mediaId) {
    const media = await docClient.send(new GetCommand({
      TableName: 'MediaCatalog',
      Key: { mediaId, entityKey: MEDIA_META_KEY },
    }))
    if (!media.Item) {
      throw createError({ statusCode: 400, statusMessage: 'Unknown mediaId' })
    }
    mediaTitle = media.Item.title as string
  }

  const quote: Quote = {
    quoteId: crypto.randomUUID(),
    userId: user.userId,
    displayName: user.displayName,
    text,
    speaker,
    mediaId: mediaId || null,
    mediaTitle,
    location,
    createdAt: new Date().toISOString(),
  }

  await docClient.send(new PutCommand({
    TableName: 'Quotes',
    Item: {
      ...quote,
      // GSI-Key darf nicht leer sein, ohne Medium landet das Zitat einfach nicht im Index
      ...(mediaId ? { mediaLocation: `${mediaId}#${location}` } : {}),
    },
  }))

  try {
    await sendPushToOthers(user.userId, {
      title: `💬 ${user.displayName} hat ein neues Zitat angelegt`,
      body: `"${text.length > 120 ? `${text.slice(0, 117)}...` : text}"${mediaTitle ? ` – ${mediaTitle}` : ''}`,
      url: '/',
    })
  } catch (err) {
    console.error('Push fuer neues Zitat fehlgeschlagen:', err)
  }

  return quote
})

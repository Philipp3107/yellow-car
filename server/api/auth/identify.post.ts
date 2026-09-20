import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError, type H3Event } from 'h3'

// Fixer Range-Key: Users-Tabelle hat userId (Hash) + username (Range) als Primärschlüssel,
// wir nutzen die Geräte-ID direkt als userId und einen festen Range-Key, damit wir den
// Nutzer per GetItem finden können, ohne den Anzeigenamen vorher zu kennen.
const PROFILE_RANGE_KEY = 'profile'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)
  const deviceId = body?.deviceId

  if (!deviceId || typeof deviceId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing deviceId' })
  }

  const docClient = createDynamoClient()

  const existing = await docClient.send(new GetCommand({
    TableName: 'Users',
    Key: { userId: deviceId, username: PROFILE_RANGE_KEY },
  }))

  if (existing.Item) {
    return {
      userId: deviceId,
      displayName: existing.Item.displayName as string,
      isNew: false,
    }
  }

  const displayName = typeof body?.displayName === 'string' && body.displayName.trim()
    ? body.displayName.trim()
    : `Spieler-${deviceId.slice(0, 4)}`

  await docClient.send(new PutCommand({
    TableName: 'Users',
    Item: {
      userId: deviceId,
      username: PROFILE_RANGE_KEY,
      displayName,
      createdAt: new Date().toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(userId)',
  }))

  return { userId: deviceId, displayName, isNew: true }
})

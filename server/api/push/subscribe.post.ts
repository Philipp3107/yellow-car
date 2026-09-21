import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError, type H3Event } from 'h3'

const PROFILE_RANGE_KEY = 'profile'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)
  const deviceId = body?.deviceId
  const subscription = body?.subscription

  if (!deviceId || typeof deviceId !== 'string' || !subscription) {
    throw createError({ statusCode: 400, statusMessage: 'Missing deviceId or subscription' })
  }

  const docClient = createDynamoClient()

  await docClient.send(new UpdateCommand({
    TableName: 'Users',
    Key: { userId: deviceId, username: PROFILE_RANGE_KEY },
    UpdateExpression: 'SET pushSubscription = :sub',
    ExpressionAttributeValues: { ':sub': JSON.stringify(subscription) },
  }))

  return { ok: true }
})

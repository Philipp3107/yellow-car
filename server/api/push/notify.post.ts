import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError, getHeader, type H3Event } from 'h3'

const PROFILE_RANGE_KEY = 'profile'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()

  // Nur die Lambda (mit dem geteilten Secret) darf Push-Benachrichtigungen ausloesen
  const secret = getHeader(event, 'x-push-secret')
  if (!config.pushSecret || secret !== config.pushSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    throw createError({ statusCode: 500, statusMessage: 'VAPID keys not configured' })
  }

  const body = await readBody(event)
  const { userId, points, description } = body || {}

  const docClient = createDynamoClient()

  const scorer = await docClient.send(new GetCommand({
    TableName: 'Users',
    Key: { userId, username: PROFILE_RANGE_KEY },
  }))
  const displayName = (scorer.Item?.displayName as string) || userId

  return sendPushToOthers(userId, {
    title: points > 0 ? `🟡 ${displayName} hat ${points} Punkt(e) geholt!` : `${displayName} hat ein Auto gemeldet`,
    body: description || 'Neue Sichtung in der App.',
    url: '/',
  })
})

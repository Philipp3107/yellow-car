import { ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import webpush from 'web-push'
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

  webpush.setVapidDetails(config.vapidSubject as string, config.vapidPublicKey as string, config.vapidPrivateKey as string)

  const docClient = createDynamoClient()

  const scorer = await docClient.send(new GetCommand({
    TableName: 'Users',
    Key: { userId, username: PROFILE_RANGE_KEY },
  }))
  const displayName = (scorer.Item?.displayName as string) || userId

  const users = await docClient.send(new ScanCommand({ TableName: 'Users' }))

  const payload = JSON.stringify({
    title: points > 0 ? `🟡 ${displayName} hat ${points} Punkt(e) geholt!` : `${displayName} hat ein Auto gemeldet`,
    body: description || 'Neue Sichtung in der App.',
    url: '/',
  })

  const recipients = (users.Items || []).filter((user) => user.userId !== userId && user.pushSubscription)

  const results = await Promise.allSettled(
    recipients.map((user) => webpush.sendNotification(JSON.parse(user.pushSubscription as string), payload)),
  )

  return { sent: results.filter((r) => r.status === 'fulfilled').length, total: recipients.length }
})

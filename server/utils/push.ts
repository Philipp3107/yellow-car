import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import webpush from 'web-push'

export interface PushPayload {
  title: string
  body: string
  url: string
}

export async function sendPushToOthers(senderUserId: string, payload: PushPayload) {
  const config = useRuntimeConfig()
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    throw new Error('VAPID keys not configured')
  }

  webpush.setVapidDetails(config.vapidSubject as string, config.vapidPublicKey as string, config.vapidPrivateKey as string)

  const docClient = createDynamoClient()
  const users = await docClient.send(new ScanCommand({ TableName: 'Users' }))
  const recipients = (users.Items || []).filter((user) => user.userId !== senderUserId && user.pushSubscription)

  const message = JSON.stringify(payload)
  const results = await Promise.allSettled(
    recipients.map((user) => webpush.sendNotification(JSON.parse(user.pushSubscription as string), message)),
  )

  return { sent: results.filter((r) => r.status === 'fulfilled').length, total: recipients.length }
}

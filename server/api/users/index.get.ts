import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const docClient = createDynamoClient()

  const users = await docClient.send(new ScanCommand({ TableName: 'Users' }))

  const leaderboard = await Promise.all(
    (users.Items || []).map(async (user) => {
      const sightings = await docClient.send(new QueryCommand({
        TableName: 'SightingEvents',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': user.userId },
      }))

      const totalPoints = (sightings.Items || []).reduce(
        (sum, item) => sum + (Number(item.points) || 0),
        0,
      )

      return {
        userId: user.userId as string,
        displayName: (user.displayName as string) || (user.userId as string),
        totalPoints,
      }
    }),
  )

  return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints)
})

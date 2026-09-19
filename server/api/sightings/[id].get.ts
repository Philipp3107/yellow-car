import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' })
const docClient = DynamoDBDocumentClient.from(client)

export default defineEventHandler(async (event) => {
  const sightingId = getRouterParam(event, 'id')

  if (!sightingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sighting ID' })
  }

  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: 'SightingEvents',
        Key: { eventId: sightingId },
      })
    )

    if (!response.Item) {
      return { status: 'PENDING' }
    }

    return {
      status: 'COMPLETED',
      result: response.Item,
    }
  } catch (err: any) {
    return { status: 'PENDING', error: err.message }
  }
})

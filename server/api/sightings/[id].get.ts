import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { defineEventHandler, readBody, createError, getRouterParam, type H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const sightingId = getRouterParam(event, 'id')


  if (!sightingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sighting ID' })
  }

  try {
    const client = new DynamoDBClient({
      region: (config.myRegion as string) || 'eu-central-1',
      credentials: {
        accessKeyId: (config.myAccessKeyId as string) || '',
        secretAccessKey: (config.mySecretAccessKey as string) || '',
      }
    })
    const docClient = DynamoDBDocumentClient.from(client)

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

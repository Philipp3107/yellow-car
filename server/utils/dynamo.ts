import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export function createDynamoClient() {
  const config = useRuntimeConfig()

  const client = new DynamoDBClient({
    region: (config.myRegion as string) || 'eu-central-1',
    credentials: {
      accessKeyId: (config.myAccessKeyId as string) || '',
      secretAccessKey: (config.mySecretAccessKey as string) || '',
    },
  })

  return DynamoDBDocumentClient.from(client)
}

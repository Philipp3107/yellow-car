import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { createError } from 'h3'
import type { MediaType } from '../interface'

export const MEDIA_META_KEY = 'META'
export const MEDIA_TYPES: MediaType[] = ['SERIES', 'MOVIE', 'BOOK', 'GAME', 'OTHER']

export async function requireUser(userId: string) {
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }
  const docClient = createDynamoClient()
  const user = await docClient.send(new GetCommand({
    TableName: 'Users',
    Key: { userId, username: 'profile' },
  }))
  if (!user.Item) {
    throw createError({ statusCode: 403, statusMessage: 'Unknown user' })
  }
  return { userId, displayName: (user.Item.displayName as string) || userId }
}

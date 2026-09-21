import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const docClient = createDynamoClient()

  const region = (config.myRegion as string) || 'eu-central-1'
  const bucketName = (config.s3BucketName as string) || process.env.S3_BUCKET_NAME || 'yellow-car-uploads-bucket'

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: (config.myAccessKeyId as string) || '',
      secretAccessKey: (config.mySecretAccessKey as string) || '',
    },
  })

  const result = await docClient.send(new ScanCommand({ TableName: 'SightingEvents' }))

  const sightings = await Promise.all(
    (result.Items || []).map(async (item) => {
      const imageUrl = item.imageKey
        ? await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucketName, Key: item.imageKey as string }), { expiresIn: 3600 })
        : null

      return {
        eventId: item.eventId as string,
        userId: item.userId as string,
        imageUrl,
        points: Number(item.points) || 0,
        isCar: Boolean(item.isCar),
        isYellow: Boolean(item.isYellow),
        isSmart: Boolean(item.isSmart),
        description: (item.description as string) || '',
        timestamp: (item.timestamp as string) || '',
      }
    }),
  )

  return sightings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
})

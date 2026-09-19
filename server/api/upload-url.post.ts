import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = body.userId || 'user123'
  const fileExtension = body.filename ? body.filename.split('.').pop() : 'jpg'

  const sightingId = randomUUID()
  // Der Pfad entspricht deinem Lambda-Pattern: uploads/{userId}/{filename}
  const s3Key = `uploads/${userId}/${sightingId}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'yellow-car-uploads-bucket',
    Key: s3Key,
    ContentType: body.contentType || 'image/jpeg',
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

  return {
    uploadUrl,
    sightingId,
    s3Key,
  }
})

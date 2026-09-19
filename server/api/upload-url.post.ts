import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { defineEventHandler, readBody, createError, type H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody(event)

    const contentType = body.contentType || 'image/jpeg'
    const userId = body.userId || 'user123'
    const fileExtension = body.filename ? body.filename.split('.').pop() : 'jpg'

    const sightingId = randomUUID()
    const s3Key = `uploads/${userId}/${sightingId}.${fileExtension}`

    const s3Client = new S3Client({
      region: process.env.MY_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.MY_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.MY_SECRET_ACCESS_KEY || '',
      },
    })

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'yellow-car-uploads-bucket',
      Key: s3Key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

    return {
      uploadUrl,
      sightingId,
      s3Key,
    }
  } catch (err: any) {
    console.error("Fehler beim Generieren der Presigned URL:", err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Interner Serverfehler',
    })
  }
})

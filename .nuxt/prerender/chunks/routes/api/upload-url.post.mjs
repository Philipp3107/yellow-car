import { S3Client, PutObjectCommand } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/client-s3/dist-cjs/index.js';
import { getSignedUrl } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/s3-request-presigner/dist-cjs/index.js';
import { randomUUID } from 'node:crypto';
import { defineEventHandler, readBody, createError } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/h3/dist/index.mjs';

const uploadUrl_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const contentType = body.contentType || "image/jpeg";
    const userId = body.userId || "user123";
    const fileExtension = body.filename ? body.filename.split(".").pop() : "jpg";
    const sightingId = randomUUID();
    const s3Key = `uploads/${userId}/${sightingId}.${fileExtension}`;
    const s3Client = new S3Client({
      region: process.env.MY_REGION || "eu-central-1",
      credentials: {
        accessKeyId: process.env.MY_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MY_SECRET_ACCESS_KEY || ""
      }
    });
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "yellow-car-uploads-bucket",
      Key: s3Key,
      ContentType: contentType
    });
    console.log(process.env.MY_REGION);
    console.log(process.env.MY_ACCESS_KEY_ID);
    console.log(process.env.MY_SECRET_ACCESS_KEY);
    console.log(process.env.S3_BUCKET_NAME);
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return {
      uploadUrl,
      sightingId,
      s3Key
    };
  } catch (err) {
    console.error("Fehler beim Generieren der Presigned URL:", err);
    throw createError({
      statusCode: 500,
      statusMessage: err.message || "Interner Serverfehler"
    });
  }
});

export { uploadUrl_post as default };
//# sourceMappingURL=upload-url.post.mjs.map

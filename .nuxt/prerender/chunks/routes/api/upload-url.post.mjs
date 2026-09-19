import { defineEventHandler, readBody } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/h3/dist/index.mjs';
import { PutObjectCommand, S3Client } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/client-s3/dist-cjs/index.js';
import { getSignedUrl } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/s3-request-presigner/dist-cjs/index.js';
import { randomUUID } from 'node:crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1"
});
const uploadUrl_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const userId = body.userId || "user123";
  const fileExtension = body.filename ? body.filename.split(".").pop() : "jpg";
  const sightingId = randomUUID();
  const s3Key = `uploads/${userId}/${sightingId}.${fileExtension}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || "yellow-car-uploads-bucket",
    Key: s3Key,
    ContentType: body.contentType || "image/jpeg"
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return {
    uploadUrl,
    sightingId,
    s3Key
  };
});

export { uploadUrl_post as default };
//# sourceMappingURL=upload-url.post.mjs.map

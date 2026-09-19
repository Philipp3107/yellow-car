import { DynamoDBClient } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/client-dynamodb/dist-cjs/index.js';
import { GetCommand, DynamoDBDocumentClient } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/@aws-sdk/lib-dynamodb/dist-cjs/index.js';
import { defineEventHandler, getRouterParam, createError } from 'file:///Users/philippkotte/Developer/aws/hannen-yellow-car/frontend/node_modules/h3/dist/index.mjs';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const docClient = DynamoDBDocumentClient.from(client);
const _id__get = defineEventHandler(async (event) => {
  const sightingId = getRouterParam(event, "id");
  if (!sightingId) {
    throw createError({ statusCode: 400, statusMessage: "Missing sighting ID" });
  }
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: "SightingEvents",
        Key: { eventId: sightingId }
      })
    );
    if (!response.Item) {
      return { status: "PENDING" };
    }
    return {
      status: "COMPLETED",
      result: response.Item
    };
  } catch (err) {
    return { status: "PENDING", error: err.message };
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map

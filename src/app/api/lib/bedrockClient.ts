import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

// Initialize AWS Bedrock client with credentials
export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!, // e.g., "us-east-1"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

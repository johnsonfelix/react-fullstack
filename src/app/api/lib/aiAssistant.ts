import { bedrockClient } from "./bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Exponential backoff with jitter for ThrottlingException
export async function getAICompletion(prompt: string, retries = 5): Promise<string> {
  const command = new InvokeModelCommand({
  modelId: "arn:aws:bedrock:ap-south-1:762703128013:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0", // Replace with your actual inference profile ARN/ID
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
    temperature: 0.2,
  }),
});


  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await bedrockClient.send(command);
      const rawBody = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(rawBody);

      const textContent =
        parsed.content
          ?.filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("\n\n") ?? "";

      return textContent;
    } catch (err: any) {
      if (err?.name === "ThrottlingException" && attempt < retries) {
        const baseDelay = 1000 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 1500);
        const totalDelay = baseDelay + jitter;
        await new Promise((res) => setTimeout(res, totalDelay));
      } else {
        throw err;
      }
    }
  }

  throw new Error("AI Bedrock API throttled after maximum retries.");
}

import { bedrockClient } from "./bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Exponential backoff for ThrottlingException
export async function getAICompletion(prompt: string, retries = 3): Promise<string> {
  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await bedrockClient.send(command);
      const rawBody = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(rawBody);

      // Safely extract and concatenate all returned text blocks
      const textContent = parsed.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n\n") ?? "";

      return textContent;
    } catch (err: any) {
      if (
        err?.name === 'ThrottlingException' && attempt < retries
      ) {
        // Exponential backoff: 1000ms, 2000ms, 4000ms, ...
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
      } else {
        throw err;
      }
    }
  }

  // Defensive error (should not be reached)
  throw new Error("AI Bedrock API throttled after maximum retries.");
}

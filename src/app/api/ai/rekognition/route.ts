import { NextRequest, NextResponse } from 'next/server';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.REGION!,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

// Bedrock client (Titan Text G1 Lite)
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REGION!,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    // 1. Parse uploaded image
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Detect product label with Rekognition
    const detectCommand = new DetectLabelsCommand({
      Image: { Bytes: buffer },
      MaxLabels: 10,
      MinConfidence: 70,
    });
    const rekogResult = await rekognitionClient.send(detectCommand);
    const topLabel = getTopLabel(rekogResult.Labels);
    if (!topLabel) {
      return NextResponse.json({ product: null, questions: [] });
    }

    // 3. Create prompt for Titan
    const claudePrompt = `
\n\nHuman: You're a procurement assistant.
A user uploaded a product image that was identified as a "${topLabel}".
Ask 6–8 highly specific questions that a supplier would need to provide a quote.

Focus on details like:
- Front-load or top-load (if washer)
- Capacity (in kg, liters, etc.)
- Required features (e.g., inverter motor, dryer, smart controls)
- Dimensions and energy rating
- Voltage and power
- Quantity

Avoid general labels like “Model?” or “Specs?”.
Return your output as a clear, numbered list.

\n\nAssistant:
`.trim();


    // 4. Call Bedrock Titan
  const llmCommand = new InvokeModelCommand({
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    messages: [
      { role: "user", content: claudePrompt }
    ],
    max_tokens: 800
  }),
});


    const llmResponse = await bedrockClient.send(llmCommand);
    const rawOutput = new TextDecoder().decode(llmResponse.body);
    const parsed = JSON.parse(rawOutput);
    const outputText = parsed.content?.[0]?.text ?? "";
    const questions = outputText.split('\n').filter((q: string) => q.trim());

    // 5. Return result
    return NextResponse.json({ product: topLabel, questions });

  } catch (err: any) {
    console.error("Error in API:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Utility to get most confident label
function getTopLabel(labels: any[] = []): string | null {
  
  if (!labels.length) return null;

  const GENERIC_LABELS = ['Appliance', 'Device', 'Electronics', 'Hardware', 'Screen', 'Person','Electrical Device'];

  const specific = labels
    .filter(label => label.Confidence >= 70 && !GENERIC_LABELS.includes(label.Name))
    .sort((a, b) => b.Confidence - a.Confidence);

  const fallback = labels.sort((a, b) => b.Confidence - a.Confidence);

  return specific[0]?.Name || fallback[0]?.Name || null;
}

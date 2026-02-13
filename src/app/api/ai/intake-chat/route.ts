import { NextRequest, NextResponse } from "next/server";
import { bedrockClient } from "@/app/api/lib/bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentDraft } = await req.json();

    const systemPrompt = `
You are an AI Procurement Assistant. Your goal is to help the user define their procurement request.
You need to gather the following information:
1. Description of the need
2. Type of request (goods or service)
3. Category (e.g., IT, Office Supplies, Marketing)
4. Delivery Address (City/Location)
5. Estimated Value (Budget/Cost) - Look for patterns like "$5000", "5k budget", "around 10000 dollars"
6. Need By Date (Deadline) - Look for patterns like "by next friday", "before Dec 31st", "in 2 weeks"

Current Draft State:
${JSON.stringify(currentDraft, null, 2)}

Conversation History:
${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}

Instructions:
- Analyze the user's latest message and the history.
- **CRITICAL**: Check the "Current Draft State". If a field (especially "address") is already populated, DO NOT ask for it again unless the user explicitly wants to change it.
- **Item Extraction**: If the user mentions items (e.g., "10 pencils and 5 pens"), extract them into the \`items\` array with \`name\` and \`quantity\`.
    - Example: "I need 10 pencils" -> items: [{ "name": "pencils", "quantity": 10 }]
    - Example: "5 laptops" -> items: [{ "name": "laptops", "quantity": 5 }]
- If the user is unsure, offer suggestions based on the context.
- Prioritize getting the "description" and "requestType" first if missing.
- Once you have enough information (at least description, requestType, category, and address), you can consider the intake complete, but ask if they want to add anything else first.
- If the user says they are done or confirms the details, set "isComplete" to true.

Output Format:
You must output ONLY a valid JSON object with no markdown formatting.
{
  "response": "Your response to the user here.",
  "updatedDraft": {
    "description": "...",
    "requestType": "goods" | "service",
    "category": "...",
    "address": "...",
    "value": "1000",
    "needByDate": "YYYY-MM-DD",
    "items": []
  },
  "isComplete": boolean // true if the intake is finished
}
`;

    const command = new InvokeModelCommand({
      modelId: "arn:aws:bedrock:ap-south-1:762703128013:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        messages: [{ role: "user", content: systemPrompt }],
        max_tokens: 2048,
        temperature: 0.1, // Low temperature for consistent JSON
      }),
    });

    const response = await bedrockClient.send(command);
    const rawBody = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(rawBody);

    let textContent = parsed.content
      ?.filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n\n") ?? "";

    // Cleanup potential markdown code blocks if the model ignores instructions
    textContent = textContent.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiResult;
    try {
      aiResult = JSON.parse(textContent);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", textContent);
      // Fallback if JSON parsing fails
      aiResult = {
        response: "I'm having trouble processing that. Could you please repeat?",
        updatedDraft: currentDraft,
        isComplete: false,
      };
    }

    return NextResponse.json(aiResult);
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

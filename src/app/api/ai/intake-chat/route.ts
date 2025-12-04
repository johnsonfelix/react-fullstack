import { NextRequest, NextResponse } from "next/server";
import { bedrockClient } from "@/app/api/lib/bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentDraft } = await req.json();

    const systemPrompt = `
You are an expert procurement assistant. Your goal is to help the user define a procurement request.
You need to gather the following information to complete the "procurementDraft" object:
1. description: Detailed description of what is needed.
2. requestType: "goods" or "service".
3. category: A short category string (e.g., "IT Equipment", "Consulting").
4. address: Delivery or service address.
5. items: An array of items (if goods) or deliverables (if service). Each item should have a name and quantity.
6. scopeOfWork: (Only if requestType is service) A description of the scope.

Current Draft State:
${JSON.stringify(currentDraft, null, 2)}

Conversation History:
${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}

Instructions:
- Analyze the user's latest message and the history.
- Extract any new information relevant to the fields above and update the draft.
- If the user hasn't provided a piece of information, ask for it politely.
- If the user is unsure, offer suggestions based on the context.
- Prioritize getting the "description" and "requestType" first if missing.
- Once you have enough information (at least description, requestType, category, and address), you can consider the intake complete, but ask if they want to add anything else first.
- If the user says they are done or confirms the details, set "isComplete" to true.

Output Format:
You must output ONLY a valid JSON object with no markdown formatting.
{
  "response": "Your response to the user here.",
  "updatedDraft": { ... }, // The fully updated draft object
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

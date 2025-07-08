import { NextResponse } from "next/server";
import { getAICompletion } from "../../lib/aiAssistant";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    const prompt = `
You are a procurement classification assistant.
Classify the following user input into:

- requestType (either "Goods" or "Services")
- category (a broad category like "Electronics", "Office Supplies", "IT Services", "Construction", etc.)

User Input: "${input}"

Respond ONLY in the following JSON format without explanations:
{
  "requestType": "",
  "category": ""
}
    `.trim();

    const aiText = await getAICompletion(prompt);

    // Attempt to parse the returned JSON safely
    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      console.error("AI response parse error:", e, aiText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: aiText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requestType: parsed.requestType,
      category: parsed.category,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

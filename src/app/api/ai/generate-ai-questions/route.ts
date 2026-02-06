import { NextResponse } from "next/server";
import { getAICompletion } from "../../lib/aiAssistant";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {

    const { input, type } = await req.json();

    let prompt = "";

    if (type === "esg") {
      prompt = `
You are a procurement AI assistant specializing in ESG (Environmental, Social, and Governance).

Generate 5 to 7 **direct, factual ESG-related questions** a procurement officer should ask a supplier.

Instructions:
- Focus on sustainability, labor practices, diversity, and governance.
- Respond ONLY in this exact JSON array format:
[
  { "question": "Question text", "answer": "Expected or example answer" },
  ...
]
Do not add explanations.
`.trim();
    } else if (type === "gdpr") {
      prompt = `
You are a procurement AI assistant specializing in Data Privacy and GDPR.

Generate 5 to 7 **direct, factual GDPR compliance questions** a procurement officer should ask a supplier.

Instructions:
- Focus on data handling, consent, breach notification, and DPO details.
- Respond ONLY in this exact JSON array format:
[
  { "question": "Question text", "answer": "Expected or example answer" },
  ...
]
Do not add explanations.
`.trim();
    } else {
      // Default / Technical
      prompt = `
You are a procurement AI assistant.

Generate 5 to 7 **direct, factual answers** a procurement officer should capture about the following requirement, and generate clear questions to elicit these answers.

Requirement/Context: "${input}"

Instructions:
- Use **concrete example values** in answers.
- Provide **realistic, direct values** a procurement officer would record.
- Respond ONLY in this exact JSON array format:
[
  { "question": "Question text", "answer": "Direct factual answer" },
  ...
]
Do not add explanations.
`.trim();
    }

    const aiText = await getAICompletion(prompt);

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

    // Attach UUIDs to each question
    const structuredQuestions = parsed.map((item: any) => ({
      id: uuidv4(),
      question: item.question,
      answer: item.answer,
    }));

    return NextResponse.json(structuredQuestions);

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

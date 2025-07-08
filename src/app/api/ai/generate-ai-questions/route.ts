import { NextResponse } from "next/server";
import { getAICompletion } from "../../lib/aiAssistant";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {

    const { input } = await req.json();

const prompt = `
You are a procurement AI assistant.

Generate 5 to 7 **direct, factual answers** a procurement officer should capture about the following requirement, and generate clear questions to elicit these answers.

Requirement: "${input}"

Instructions:
- Use **concrete example values** in answers, even if assumptions are needed.
- Do NOT use phrases like "should be specified," "could be," or "to be determined."
- Provide **realistic, direct values** a procurement officer would record.
- Respond ONLY in this exact JSON array format:
[
  { "question": "Question 1 text", "answer": "Direct factual answer 1" },
  { "question": "Question 2 text", "answer": "Direct factual answer 2" },
  ...
]
Do not add explanations or extra text.
`.trim();

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

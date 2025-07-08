import { NextRequest, NextResponse } from "next/server";
import { getAICompletion } from "../../lib/aiAssistant";

export async function POST(req: NextRequest) {
  try {
    const { description, instruction } = await req.json();

    const prompt = `
You are a procurement assistant tasked with improving a Scope of Work (SOW) description.

Instruction: "${instruction}"
Current Description: "${description}"

Provide an improved *addition* to the description that aligns with the instruction, ensuring it integrates seamlessly with the existing description. Do not repeat what is already clear in the current description.

Return ONLY the additional improved text that should be added, without any commentary or JSON formatting.
`.trim();

    const additionalText = await getAICompletion(prompt);

    return NextResponse.json({ addition: additionalText.trim() });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

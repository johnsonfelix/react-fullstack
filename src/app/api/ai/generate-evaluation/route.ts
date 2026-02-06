import { NextRequest, NextResponse } from "next/server";
import { bedrockClient } from "@/app/api/lib/bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req: NextRequest) {
    try {
        const { sowSummary, category } = await req.json();

        if (!sowSummary) {
            return NextResponse.json({ error: "SOW Summary is required" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert procurement assistant.
Based on the provided Scope of Work (SOW) summary and category (${category || "General"}), generate a list of evaluation criteria.
Create two sections: "Technical" and "Commercial".
For "Technical", provide 4 sub-criteria.
For "Commercial", provide 4 sub-criteria.
Assign weights such that the total for Technical is roughly 70 and Commercial is roughly 30.
Return the result as a simple JSON object with keys "technical" and "commercial", where each is an array of objects with "name" (string) and "weight" (number).
Do not include any markdown or extra text.

SOW Summary:
"${sowSummary}"

Example Output:
{
  "technical": [
    { "name": "Quality Standards", "weight": 25 },
    { "name": "Delivery Capability", "weight": 15 },
    { "name": "Technical Support", "weight": 15 },
    { "name": "Past Performance", "weight": 15 }
  ],
  "commercial": [
    { "name": "Unit Price", "weight": 15 },
    { "name": "TCO", "weight": 5 },
    { "name": "Payment Terms", "weight": 5 },
    { "name": "Warranty", "weight": 5 }
  ]
}
`;

        const command = new InvokeModelCommand({
            modelId: "arn:aws:bedrock:ap-south-1:762703128013:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                messages: [{ role: "user", content: systemPrompt }],
                max_tokens: 1024,
                temperature: 0.1,
            }),
        });

        const response = await bedrockClient.send(command);
        const rawBody = new TextDecoder().decode(response.body);
        const parsed = JSON.parse(rawBody);

        let textContent = parsed.content
            ?.filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("\n\n") ?? "";

        // Cleanup
        textContent = textContent.replace(/```json/g, "").replace(/```/g, "").trim();

        const result = JSON.parse(textContent);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("AI Evaluation Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { bedrockClient } from "@/app/api/lib/bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req: NextRequest) {
    try {
        const { sowSummary } = await req.json();

        if (!sowSummary) {
            return NextResponse.json({ error: "SOW Summary is required" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert procurement assistant.
Based on the provided Scope of Work (SOW) summary, generate a list of structured line items.
Extract key deliverables with estimated quantities if implied (default to 1 if not specified).

Return the result as a simple JSON object with a single key "items" containing an array of objects.
Each object should have:
- title: Short string description
- quantity: Number
- uom: String (e.g., "Each", "Hours", "Lots", "Months")
- location: String (optional, inferred from context or empty)

Do not include any markdown or extra text.

SOW Summary:
"${sowSummary}"

Example Output:
{
  "items": [
    { "title": "High Performance Laptop", "quantity": 10, "uom": "Each", "location": "NY Office" },
    { "title": "Software License", "quantity": 1, "uom": "Year", "location": "" }
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
        console.error("AI Items Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

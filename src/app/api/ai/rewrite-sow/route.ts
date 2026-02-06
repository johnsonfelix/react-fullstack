import { NextRequest, NextResponse } from "next/server";
import { bedrockClient } from "@/app/api/lib/bedrockClient";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const systemPrompt = `
You are an expert procurement consultant.
Rewite the following Scope of Work (SOW) description to be more professional, precise, and clear.
Retain all the original meaning and details.
Do not add any preamble or markdown. Just return the rewritten text.

Original Text:
"${text}"
`;

        const command = new InvokeModelCommand({
            modelId: "arn:aws:bedrock:ap-south-1:762703128013:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                messages: [{ role: "user", content: systemPrompt }],
                max_tokens: 2048,
                temperature: 0.5,
            }),
        });

        const response = await bedrockClient.send(command);
        const rawBody = new TextDecoder().decode(response.body);
        const parsed = JSON.parse(rawBody);

        let rewrittenText = parsed.content
            ?.filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("\n\n") ?? "";

        rewrittenText = rewrittenText.trim();

        return NextResponse.json({ rewrittenText });
    } catch (error: any) {
        console.error("AI Rewrite SOW Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}


import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
    try {
        // Fetch the first template (assuming single master workflow for now)
        const template = await prisma.approvalWorkflowTemplate.findFirst({
            include: {
                steps: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        return NextResponse.json(template || { steps: [] });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { steps, defaultSla, allowParallel, sendReminders } = body;

        // Upsert the master template
        // We'll try to find one first
        let template = await prisma.approvalWorkflowTemplate.findFirst();

        if (!template) {
            template = await prisma.approvalWorkflowTemplate.create({
                data: {
                    name: "Master Workflow",
                    defaultSla,
                    allowParallel,
                    sendReminders
                }
            });
        } else {
            await prisma.approvalWorkflowTemplate.update({
                where: { id: template.id },
                data: {
                    defaultSla,
                    allowParallel,
                    sendReminders
                }
            });
        }

        // Handle Steps Transactionally
        // Delete all existing steps for this template and recreate them
        // This is simpler than diffing for now
        await prisma.$transaction(async (tx) => {
            await tx.approvalStepTemplate.deleteMany({
                where: { templateId: template.id }
            });

            if (steps && steps.length > 0) {
                await tx.approvalStepTemplate.createMany({
                    data: steps.map((s: any, idx: number) => ({
                        templateId: template.id,
                        order: idx + 1,
                        role: s.role,
                        approverName: s.approverName,
                        slaDuration: s.slaDuration,
                        condition: s.condition,
                        conditionType: s.conditionType || null,
                        conditionOperator: s.conditionOperator || null,
                        conditionValue: s.conditionValue || null,
                        isRequired: s.isRequired || false
                    }))
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Template Save Error", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

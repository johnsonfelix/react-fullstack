
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { sendApprovalEmail } from "@/lib/mail";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // await params in next.js 15+

        // 1. Fetch RFP and Approval configuration
        const rfp = await prisma.procurementRequest.findUnique({
            where: { id },
            include: {
                approval: {
                    include: {
                        steps: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!rfp) {
            return NextResponse.json({ error: "RFP not found" }, { status: 404 });
        }

        // 2. Initial Submission Logic
        // If no approval workflow, just approve properly.
        // Ideally we should check if it's already submitted.

        // Check if approval steps exist. If not, try to instantiate from Template.
        let approvalSteps = rfp.approval?.steps || [];

        if (approvalSteps.length === 0) {
            // Fetch Master Template
            const template = await prisma.approvalWorkflowTemplate.findFirst({
                include: { steps: { orderBy: { order: 'asc' } } }
            });

            if (template && template.steps.length > 0) {
                // Ensure ProcurementApproval container exists
                let approvalId = rfp.approval?.id;
                if (!approvalId) {
                    const newApproval = await prisma.procurementApproval.create({
                        data: {
                            procurementRequestId: id,
                        }
                    });
                    approvalId = newApproval.id;
                }

                // Copy steps from template
                await prisma.approvalStep.createMany({
                    data: template.steps.map(tStep => ({
                        approvalId: approvalId!,
                        role: tStep.role,
                        approverName: tStep.approverName,
                        order: tStep.order,
                        slaDuration: tStep.slaDuration || "48 hrs",
                        condition: tStep.condition,
                        isRequired: tStep.isRequired,
                        status: "PENDING" // Ideally subsequent steps should be "FUTURE" or similar, but for logic simplicity we rely on 'order'
                    }))
                });

                // Refetch to get the created steps with IDs
                const updatedRfp = await prisma.procurementRequest.findUnique({
                    where: { id },
                    include: { approval: { include: { steps: { orderBy: { order: 'asc' } } } } }
                });
                approvalSteps = updatedRfp?.approval?.steps || [];

            } else {
                // No template, No steps -> Auto Approve
                await prisma.procurementRequest.update({
                    where: { id },
                    data: { status: "approved" }
                });
                return NextResponse.json({ message: "Auto-approved (no workflow defined)" });
            }
        }

        // 3. Reset steps if needed (or start fresh)
        // 3. Reset steps if needed (or start fresh)
        const firstStep = approvalSteps[0];

        // Update all steps to PENDING if re-submitting, or specifically set first to PENDING
        // For simplicity, let's set first step to PENDING and others to FUTURE (or just leave them)
        // Actually, "PENDING" means "Waiting for action".

        // Update first step status to PENDING (active)
        await prisma.approvalStep.update({
            where: { id: firstStep.id },
            data: { status: "PENDING" }
        });

        // Update RFP status
        await prisma.procurementRequest.update({
            where: { id },
            data: { status: "pending_approval" }
        });

        // 4. Send Email to First Approver
        // Generate Magic Link
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const token = Buffer.from(JSON.stringify({
            rfpId: rfp.id,
            stepId: firstStep.id,
            email: firstStep.approverName // Using name as placeholder for email lookup if needed, but ideally we should store email in ApprovalStep or look it up
        })).toString('base64');

        // Lookup Approver Email
        // 1. Try by Name
        let approverEntity = await prisma.approver.findFirst({
            where: { name: firstStep.approverName || "" }
        });

        // 2. Fallback: Try by Role if not found by Name
        if (!approverEntity && firstStep.role) {
            console.log(`Approver not found by name '${firstStep.approverName}'. Trying role '${firstStep.role}'...`);
            approverEntity = await prisma.approver.findFirst({
                where: { role: firstStep.role }
            });
        }

        const targetEmail = approverEntity?.email || "test@example.com"; // Fallback for safety or dev

        console.log(`Sending approval email to: ${targetEmail} (Role: ${firstStep.role})`);

        const approvalLink = `${baseUrl}/approval/verify?token=${token}`;
        const rejectLink = `${baseUrl}/approval/verify?token=${token}&action=reject`;

        await sendApprovalEmail(
            targetEmail,
            firstStep.approverName || approverEntity?.name || "Approver",
            rfp.title,
            approvalLink,
            rejectLink
        );

        return NextResponse.json({ success: true, message: "Submitted for approval", nextStep: firstStep });

    } catch (error) {
        console.error("Submit error:", error);
        return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }
}

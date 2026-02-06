
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { sendApprovalEmail } from "@/lib/mail";

export async function POST(req: Request) {
    try {
        const { token, decision } = await req.json();

        if (!token || !decision) {
            return NextResponse.json({ error: "Missing token or decision" }, { status: 400 });
        }

        // Decode token
        let decoded;
        try {
            decoded = JSON.parse(Buffer.from(token, 'base64').toString('ascii'));
        } catch (e) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }

        const { rfpId, stepId } = decoded;

        // Verify step exists and is pending
        const step = await prisma.approvalStep.findUnique({
            where: { id: stepId }
        });

        if (!step) {
            return NextResponse.json({ error: "Approval step not found" }, { status: 404 });
        }

        if (step.status !== "PENDING") {
            return NextResponse.json({ error: `Step is already ${step.status}` }, { status: 400 });
        }

        // Update Step Status
        await prisma.approvalStep.update({
            where: { id: stepId },
            data: {
                status: decision,
                updatedAt: new Date()
            }
        });

        // Handle Workflow Logic
        if (decision === "REJECTED") {
            // Reject entire RFP
            await prisma.procurementRequest.update({
                where: { id: rfpId },
                data: { status: "rejected" }
            });
            return NextResponse.json({ success: true, message: "Request Rejected" });
        }

        // IF APPROVED: Check for next step
        const allSteps = await prisma.approvalStep.findMany({
            where: { approvalId: step.approvalId },
            orderBy: { order: 'asc' }
        });

        const currentStepIndex = allSteps.findIndex(s => s.id === stepId);
        const nextStep = allSteps[currentStepIndex + 1];

        if (nextStep) {
            // Activate next step
            await prisma.approvalStep.update({
                where: { id: nextStep.id },
                data: { status: "PENDING" }
            });

            // Retrieve RFP title for email
            const rfp = await prisma.procurementRequest.findUnique({ where: { id: rfpId } });

            // Look up next approver email
            const approverEntity = await prisma.approver.findFirst({
                where: { name: nextStep.approverName || "" }
            });
            const targetEmail = approverEntity?.email || "test@example.com";

            // Generate new token
            const newToken = Buffer.from(JSON.stringify({
                rfpId: rfpId,
                stepId: nextStep.id,
            })).toString('base64');

            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const approvalLink = `${baseUrl}/approval/verify?token=${newToken}`;
            const rejectLink = `${baseUrl}/approval/verify?token=${newToken}&action=reject`;

            await sendApprovalEmail(
                targetEmail,
                nextStep.approverName || "Approver",
                rfp?.title || "RFP",
                approvalLink,
                rejectLink
            );

            return NextResponse.json({ success: true, message: "Approved. Moved to next step." });

        } else {
            // Final Approval
            await prisma.procurementRequest.update({
                where: { id: rfpId },
                data: { status: "approved" }
            });

            return NextResponse.json({ success: true, message: "Final Approval Complete." });
        }

    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

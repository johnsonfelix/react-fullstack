
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { stepId, action, comments } = body;

        if (!stepId || !action) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // 1. Verify User is the Correct Approver
        const approver = await prisma.approver.findFirst({
            where: { email: session.user.email }
        });

        if (!approver) {
            return NextResponse.json({ error: "Not an authorized approver" }, { status: 403 });
        }

        const step = await prisma.approvalStep.findUnique({
            where: { id: stepId },
            include: { approval: true }
        });

        if (!step) {
            return NextResponse.json({ error: "Step not found" }, { status: 404 });
        }

        // Check if this step belongs to this approver
        // We matched by name in dashboard, double check here
        if (step.approverName !== approver.name) {
            return NextResponse.json({ error: "You are not assigned to this step" }, { status: 403 });
        }

        if (step.status !== "PENDING") {
            return NextResponse.json({ error: "Step is not pending" }, { status: 400 });
        }

        // 2. Perform Update (Reuse logic from verify/route if possible, but duplicating for safety in secure context)
        const isApproved = action === 'approve';
        const newStatus = isApproved ? "APPROVED" : "REJECTED";

        // Update the step
        await prisma.approvalStep.update({
            where: { id: stepId },
            data: {
                status: newStatus,
                comments: comments || "Processed via Dashboard"
            }
        });

        if (!isApproved) {
            // REJECTED logic
            await prisma.procurementRequest.update({
                where: { id: step.approval.procurementRequestId },
                data: { status: "rejected" }
            });
            // Update all future steps to REJECTED or CANCELLED?
        } else {
            // APPROVED logic -> Advance Workflow
            // Find next step
            const nextStep = await prisma.approvalStep.findFirst({
                where: {
                    approvalId: step.approvalId,
                    order: { gt: step.order }
                },
                orderBy: { order: 'asc' }
            });

            if (nextStep) {
                // Activate next step
                await prisma.approvalStep.update({
                    where: { id: nextStep.id },
                    data: { status: "PENDING" }
                });
                // Send email to next approver (TODO: Refactor email logic to shared util)
            } else {
                // Workflow Complete
                await prisma.procurementRequest.update({
                    where: { id: step.approval.procurementRequestId },
                    data: { status: "approved" }
                });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Action Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

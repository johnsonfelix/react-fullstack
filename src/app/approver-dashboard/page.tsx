
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/app/prisma"
import { redirect } from "next/navigation"
import { FaCheckCircle, FaTimesCircle, FaClock, FaBoxOpen } from "react-icons/fa"
// Adjust layout or components as needed. Using server component for data fetching.

export default async function ApproverDashboard() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
        redirect("/sign-in")
    }

    // 1. Identify the Approver based on the logged-in user
    // We can link by email since we enforced email uniqueness and logic
    const approver = await prisma.approver.findFirst({
        where: { email: session.user.email }
    })

    if (!approver) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md border border-gray-200">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <FaClock />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
                    <p className="text-gray-600 mb-6">
                        Your account ({session.user.email}) is not registered as an official Approver in the system.
                    </p>
                    <a href="/" className="text-blue-600 hover:underline">Return Home</a>
                </div>
            </div>
        )
    }

    // 2. Fetch Pending Approvals for this approver
    // We look for steps where:
    // - status is PENDING
    // - approverName matches OR role matches (if we had dynamic assignment, but strictly matching name is safer for implemented logic)
    // - For robust matching, we should store `approverId` on the step, but currently we store `approverName`.
    // - Let's match by `approverName` OR `role`? The submission logic currently sets `approverName` on the step.

    // We'll match by name since the admin tool sets the specific name.
    const pendingSteps = await prisma.approvalStep.findMany({
        where: {
            status: "PENDING",
            approverName: approver.name
        },
        include: {
            approval: {
                include: {
                    procurementRequest: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Approver Dashboard</h1>
                        <p className="text-gray-500">Welcome back, {approver.name}. You have {pendingSteps.length} pending requests.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{session.user.email}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">{approver.role}</div>
                    </div>
                </header>

                {pendingSteps.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-4xl" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                        <p className="text-gray-500 mt-2">You have no pending approvals at this time.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {pendingSteps.map((step) => (
                            <div key={step.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <FaBoxOpen size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {step.approval.procurementRequest.title}
                                                </h3>
                                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                                    <span>Ref: #{step.approval.procurementRequest.id.slice(-6)}</span>
                                                    <span>•</span>
                                                    <span>Submitted {new Date(step.approval.procurementRequest.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                            Action Required
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100 text-sm">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <span className="block text-gray-400 text-xs uppercase mb-1">Request Type</span>
                                                <span className="font-medium text-gray-800">{step.approval.procurementRequest.requestType}</span>
                                            </div>
                                            <div>
                                                <span className="block text-gray-400 text-xs uppercase mb-1">Total Value</span>
                                                <span className="font-medium text-gray-800">AED 15,000</span> {/* Placeholder or actual if available */}
                                            </div>
                                            <div>
                                                <span className="block text-gray-400 text-xs uppercase mb-1">Department</span>
                                                <span className="font-medium text-gray-800">IT Infrastructure</span>
                                            </div>
                                            <div>
                                                <span className="block text-gray-400 text-xs uppercase mb-1">SLA Deadline</span>
                                                <span className="font-medium text-red-600">24 Hours</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3">
                                        <a
                                            href={`/buyer/rfp/${step.approval.procurementRequest.id}`}
                                            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition"
                                        >
                                            View Details
                                        </a>
                                        {/* 
                                            Ideally we use a client component for the actions or server actions.
                                            For speed, I'll redirect to the verify page with a magic token logic? 
                                            Or better, create a Client Component wrapper for the buttons.
                                        */}
                                        <ActionButtons stepId={step.id} rfpId={step.approval.procurementRequest.id} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Client Component for Actions
import { ActionButtons } from "./components/action-buttons";

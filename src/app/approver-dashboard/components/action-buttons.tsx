
"use client";

import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Assuming sonner is installed as per other files

export function ActionButtons({ stepId, rfpId }: { stepId: string, rfpId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAction = async (completedStatus: "APPROVED" | "REJECTED") => {
        if (!confirm(`Are you sure you want to ${completedStatus}?`)) return;

        setLoading(true);
        try {
            // We can reuse the verify API or a new one. 
            // The verify API expects a token. 
            // We should create a new secured API for internal dashboard actions OR 
            // for now, we can generate a temporary token on the fly? 
            // Actually, `verify` route verifies the token. 
            // Better to make a new Secure Action API.
            // Let's call `/api/approval/action` (we need to create this).

            const res = await fetch("/api/approval/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stepId,
                    action: completedStatus === "APPROVED" ? "approve" : "reject",
                    comments: "Approved via Dashboard"
                })
            });

            if (res.ok) {
                toast.success(`Request ${completedStatus === "APPROVED" ? "Approved" : "Rejected"}`);
                router.refresh(); // Refresh server component
            } else {
                toast.error("Action failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={() => handleAction("REJECTED")}
                disabled={loading}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm flex items-center gap-2 transition"
            >
                <FaTimes /> Reject
            </button>
            <button
                onClick={() => handleAction("APPROVED")}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2 transition shadow-sm"
            >
                <FaCheck /> Approve
            </button>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    ArrowRight,
    FileText,
    Calendar,
    DollarSign,
    MapPin,
    Package
} from 'lucide-react';
import { format } from 'date-fns';

type Request = {
    id: string;
    description: string;
    requestType: string;
    category: string;
    status: string;
    createdAt: string;
    needByDate: string;
    estimatedValue: string;
    department?: string;
    requester?: string;
};

export default function RequestsAdministration() {
    const router = useRouter();
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        // Optimistic update
        setRequests(prev => prev.map(req =>
            req.id === id ? { ...req, status: newStatus } : req
        ));

        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                // Revert on failure
                fetchRequests();
                alert('Failed to update status');
                return;
            }

            const data = await res.json();

            // If approved and we got an RFQ ID back
            if (newStatus === 'APPROVED' && data.rfqId && data.brfqId) {
                // Just alert success, no redirect
                alert(`Request Approved!\n\nRFQ Draft ${data.rfqId} has been created automatically.`);
                /*
                // User requested to remove the redirect prompt
                const confirmed = window.confirm(`Request Approved!\n\nRFQ Draft ${data.rfqId} has been created automatically.\n\nDo you want to view and edit this RFQ now?`);
                if (confirmed) {
                    router.push(`/buyer/events/create?rfqId=${data.brfqId}`);
                }
                */
            }

        } catch (error) {
            console.error('Failed to update status', error);
            fetchRequests();
        }
    };

    const handleCreateEvent = (requestId: string) => {
        router.push(`/buyer/events/create?requestId=${requestId}`);
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'ALL') return true;
        return req.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading requests...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Request Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and approve procurement requests</p>
                </div>
                <div className="flex gap-2">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === f
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText className="w-10 h-10 text-gray-300 mb-2" />
                                        <p>No requests found matching this filter.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{req.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="capitalize px-1.5 py-0.5 rounded bg-gray-100">{req.requestType}</span>
                                                <span>•</span>
                                                <span className="text-blue-600">{req.category}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            {req.estimatedValue && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                                    {req.estimatedValue}
                                                </div>
                                            )}
                                            {req.needByDate && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {req.needByDate}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {format(new Date(req.createdAt), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {req.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm"
                                                        title="Approve Request"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                                        title="Reject Request"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {/* Create RFQ button removed as per requirement */}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

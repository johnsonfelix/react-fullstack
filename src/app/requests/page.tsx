'use client';

import { useEffect, useState } from 'react';
import { Loader2, Eye, Calendar, MapPin, DollarSign, Package } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export default function RequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleViewDetails = (req: any) => {
        setSelectedRequest(req);
        setIsModalOpen(true);
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Procurement Requests</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Need By</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    <p className="text-sm">No requests found.</p>
                                </td>
                            </tr>
                        ) : (
                            requests.map((req: any) => (
                                <tr key={req.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{req.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{req.requestType}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {req.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{req.needByDate || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewDetails(req)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-flex items-center gap-1 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Request Details"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        {/* Header Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Status</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedRequest.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Request Type</span>
                                <span className="text-sm font-medium text-gray-900 capitalize">{selectedRequest.requestType}</span>
                            </div>
                        </div>

                        {/* Main Details */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-1">Description</h3>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {selectedRequest.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 block">Delivery Address</span>
                                        <span className="text-sm text-gray-900">{selectedRequest.address || 'Not specified'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                    <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 block">Est. Value</span>
                                        <span className="text-sm text-gray-900">{selectedRequest.estimatedValue || 'Not specified'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 block">Need By Date</span>
                                        <span className="text-sm text-gray-900">{selectedRequest.needByDate || 'Not specified'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 block">Category</span>
                                        <span className="text-sm text-gray-900">{selectedRequest.category}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-600" />
                                Requested Items
                            </h3>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {selectedRequest.items && Array.isArray(selectedRequest.items) && selectedRequest.items.length > 0 ? (
                                            selectedRequest.items.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <div className="flex items-center gap-3">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                                                                    <Package className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                                {item.catalogItemId && (
                                                                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Catalog Item</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {item.supplier || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {item.price ? `${item.currency || ''} ${item.price}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                        {item.quantity} {item.uom && <span className="text-xs text-gray-400 ml-1">{item.uom}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                        {item.price ? `${item.currency || ''} ${(item.price * item.quantity).toFixed(2)}` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                                                    No individual items specified
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

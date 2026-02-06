"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, UserCheck, Mail, Briefcase } from 'lucide-react';

export default function ApproversPage() {
    const [approvers, setApprovers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: ''
    });

    useEffect(() => {
        fetchApprovers();
    }, []);

    const fetchApprovers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/approvers');
            if (res.ok) {
                const data = await res.json();
                setApprovers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/approvers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ name: '', email: '', role: '' });
                setShowForm(false);
                fetchApprovers();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;

        try {
            await fetch(`/api/approvers?id=${id}`, { method: 'DELETE' });
            fetchApprovers();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Approvers Management</h1>
                    <p className="text-gray-500 mt-1">Manage system approvers for workflow routing.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Add Approver
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-semibold text-gray-800 mb-4">New Approver</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Sarah Johnson"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="sarah@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role / Department</label>
                            <input
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                placeholder="e.g. Finance Manager"
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Approver'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Search approvers..."
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {approvers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No approvers found. Add one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    approvers.map((approver: any) => (
                                        <tr key={approver.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
                                                        {approver.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{approver.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {approver.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                    <Briefcase size={12} />
                                                    {approver.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(approver.id)}
                                                    className="text-gray-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

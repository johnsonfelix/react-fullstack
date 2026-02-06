'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Plus, User, Mail, Briefcase } from 'lucide-react';

type ProcurementLead = {
    id: string;
    name: string;
    email: string | null;
    department: string | null;
    isActive: boolean;
    createdAt: string;
};

export default function AdminProcurementLeads() {
    const [leads, setLeads] = useState<ProcurementLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<ProcurementLead | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        department: '',
    });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/administration/procurement-leads', { cache: 'no-store' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to fetch leads');
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setLeads(data);
            }
        } catch (error: any) {
            console.error('Failed to fetch leads', error);
            setError(error.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentLead) {
                // Edit
                const res = await fetch(`/api/administration/procurement-leads/${currentLead.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (!res.ok) throw new Error('Failed to update');
            } else {
                // Create
                const res = await fetch('/api/administration/procurement-leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (!res.ok) throw new Error('Failed to create');
            }
            closeModal();
            fetchLeads();
        } catch (error) {
            alert('Error saving procurement lead');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        try {
            const res = await fetch(`/api/administration/procurement-leads/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchLeads();
        } catch (error) {
            alert('Error deleting lead');
        }
    };

    const openModal = (lead?: ProcurementLead) => {
        if (lead) {
            setCurrentLead(lead);
            setFormData({
                name: lead.name,
                email: lead.email || '',
                department: lead.department || '',
            });
        } else {
            setCurrentLead(null);
            setFormData({ name: '', email: '', department: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentLead(null);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Procurement Leads</h1>
                    <p className="text-gray-500 mt-1">Manage the list of procurement leads available for RFPs.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Add Lead
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500 flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <p className="font-medium">{error}</p>
                        <button onClick={fetchLeads} className="mt-4 text-blue-600 font-medium hover:underline">Try Again</button>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <User size={24} />
                        </div>
                        <p>No procurement leads found.</p>
                        <button onClick={() => openModal()} className="mt-4 text-blue-600 font-medium hover:underline">Create your first lead</button>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                {lead.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            {lead.email && <><Mail size={14} className="text-gray-400" /> {lead.email}</>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            {lead.department && <><Briefcase size={14} className="text-gray-400" /> {lead.department}</>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {lead.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openModal(lead)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(lead.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {currentLead ? 'Edit Procurement Lead' : 'Add Procurement Lead'}
                                </h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Department</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        />
                                    </div>
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                        <button
                                            type="submit"
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                            onClick={closeModal}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

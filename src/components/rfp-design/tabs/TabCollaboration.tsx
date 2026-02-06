"use client";

import { useState } from "react";
import { FaUserPlus, FaRobot, FaMagic, FaTimes } from "react-icons/fa";

export default function TabCollaboration({ data, onUpdate, onAutoSave }: { data?: any, onUpdate?: (updates: any) => void, onAutoSave?: (updates: any) => void }) {
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: "", email: "", role: "Spectator" });

    // Local state for immediate UI feedback (optional, but good for modals)
    // But since we rely on parent 'data', we likely just need to call onUpdate/onAutoSave.

    // We need a way to add a new user. 
    // Simplified: Just an array update.

    const handleAddUser = () => {
        if (!newUserForm.name || !newUserForm.email) {
            alert("Please enter both name and email.");
            return;
        }

        const newUser = {
            name: newUserForm.name,
            email: newUserForm.email,
            role: newUserForm.role,
            permissions: ["view_technical"]
        };

        const currentCollaborators = data?.collaborators || [];
        const updatedCollaborators = [...currentCollaborators, newUser];

        onUpdate?.({ collaborators: updatedCollaborators });
        onAutoSave?.({ collaborators: updatedCollaborators });

        // Reset and close
        setNewUserForm({ name: "", email: "", role: "Spectator" });
        setShowAddUserModal(false);
    };

    const handleUpdateUser = (index: number, field: string, value: any) => {
        const currentCollaborators = [...(data?.collaborators || [])];
        currentCollaborators[index] = { ...currentCollaborators[index], [field]: value };

        onUpdate?.({ collaborators: currentCollaborators });
        onAutoSave?.({ collaborators: currentCollaborators });
    };

    const handleRemoveUser = (index: number) => {
        if (!confirm("Remove this user?")) return;
        const currentCollaborators = (data?.collaborators || []).filter((_: any, i: number) => i !== index);
        onUpdate?.({ collaborators: currentCollaborators });
        onAutoSave?.({ collaborators: currentCollaborators });
    };

    const PERMISSIONS = [
        { id: "view_technical", label: "View Technical", icon: "👁️" },
        { id: "view_commercial", label: "View Commercial", icon: "👁️" },
        { id: "edit", label: "Edit", icon: "📝" },
        { id: "score", label: "Score", icon: "📊" },
        { id: "upload", label: "Upload", icon: "📤" }
    ];

    const togglePermission = (userIndex: number, permId: string) => {
        const user = data?.collaborators?.[userIndex];
        if (!user) return;

        const currentPerms = user.permissions || [];
        const hasPerm = currentPerms.includes(permId);

        let newPerms;
        if (hasPerm) {
            newPerms = currentPerms.filter((p: string) => p !== permId);
        } else {
            newPerms = [...currentPerms, permId];
        }

        handleUpdateUser(userIndex, "permissions", newPerms);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-800">Add New Collaborator</h3>
                            <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Sarah Johnson"
                                    value={newUserForm.name}
                                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="sarah@example.com"
                                    value={newUserForm.email}
                                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={newUserForm.role}
                                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                >
                                    <option>Procurement Lead</option>
                                    <option>Technical Evaluator</option>
                                    <option>Commercial Evaluator</option>
                                    <option>Approver</option>
                                    <option>Spectator</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddUserModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="lg:col-span-3 space-y-6">
                {/* Users & Roles Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Evaluators & Collaborators</h3>
                        <div className="flex gap-2">
                            {/* Future: Auto Assign */}
                            <button
                                onClick={() => setShowAddUserModal(true)}
                                className="flex items-center gap-2 text-blue-600 border border-blue-200 bg-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
                                <FaUserPlus /> Add User
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Permissions</th>
                                    <th className="px-6 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data?.collaborators && data.collaborators.length > 0 ? (
                                    data.collaborators.map((user: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                                                        {user.name ? user.name.substring(0, 2) : "??"}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-400">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    className="bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 focus:border-blue-500 outline-none"
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateUser(i, "role", e.target.value)}
                                                >
                                                    <option>Procurement Lead</option>
                                                    <option>Technical Evaluator</option>
                                                    <option>Commercial Evaluator</option>
                                                    <option>Approver</option>
                                                    <option>Spectator</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {PERMISSIONS.map((perm) => {
                                                        const isActive = user.permissions?.includes(perm.id);
                                                        return (
                                                            <button
                                                                key={perm.id}
                                                                onClick={() => togglePermission(i, perm.id)}
                                                                className={`
                                                                    flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors
                                                                    ${isActive
                                                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                                                        : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"}
                                                                `}
                                                                title={perm.label}
                                                            >
                                                                <span>{perm.icon}</span>
                                                                <span className="hidden xl:inline">{perm.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRemoveUser(i)}
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaTimes />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No collaborators assigned yet. Click "Add User" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend / Definitions */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Permission Definitions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PERMISSIONS.map(p => (
                            <div key={p.id} className="flex gap-3">
                                <div className="mt-0.5 text-blue-500 text-sm">{p.icon}</div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{p.label}</div>
                                    <div className="text-xs text-gray-500">Access to {p.id.replace("view_", "")} sections and evaluations</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

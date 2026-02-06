'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin, Layers, Truck, Users, Folder,
  DollarSign, Weight, CreditCard, Ship,
  Settings, Box, FileText, ClipboardList, UserCheck, GitMerge
} from 'lucide-react';

// Grouped links for better organization
const menuGroups = [
  {
    title: "Core Management",
    items: [
      { href: '/administration/address', label: 'Addresses', icon: <MapPin size={18} /> },
      { href: '/administration/categories', label: 'Categories', icon: <Layers size={18} /> },
      { href: '/administration/suppliers', label: 'Suppliers', icon: <Truck size={18} /> },
      { href: '/administration/supplier-invite', label: 'Supplier Invites', icon: <Users size={18} /> },
      { href: '/administration/projects', label: 'Projects', icon: <Folder size={18} /> },
    ]
  },
  {
    title: "Procurement",
    items: [
      { href: '/administration/questionnaires', label: 'Questionnaires', icon: <ClipboardList size={18} /> },
      { href: '/administration/procurement-leads', label: 'Procurement Leads', icon: <Users size={18} /> },
      { href: '/administration/approvers', label: 'Approvers', icon: <UserCheck size={18} /> },
      { href: '/administration/rfq', label: 'Manage RFQ', icon: <FileText size={18} /> },
      { href: '/administration/rfq/workflow', label: 'RFQ Rules', icon: <Settings size={18} /> },
      { href: '/administration/approvers-flow', label: 'Workflow', icon: <GitMerge size={18} /> },
    ]
  },
  {
    title: "System Fields",
    items: [
      { href: '/administration/fields/currency', label: 'Currency', icon: <DollarSign size={18} /> },
      { href: '/administration/fields/incoterms', label: 'Incoterms', icon: <Box size={18} /> },
      { href: '/administration/fields/serviceType', label: 'Service Type', icon: <Layers size={18} /> },
      { href: '/administration/fields/carrier', label: 'Carrier', icon: <Truck size={18} /> },
      { href: '/administration/fields/uom', label: 'UOM', icon: <Weight size={18} /> },
      { href: '/administration/fields/payment', label: 'Payment', icon: <CreditCard size={18} /> },
      { href: '/administration/fields/urgency', label: 'Urgency', icon: <Settings size={18} /> },
      { href: '/administration/fields/shipping', label: 'Shipping', icon: <Ship size={18} /> },
      { href: '/administration/terms', label: 'Terms Config', icon: <FileText size={18} /> },
    ]
  }
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50/30">
      {/* Sidebar - Fixed and scrollable if needed */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shadow-sm z-30">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 mb-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Settings size={22} />
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Admin Console</h2>
          </div>
        </div>

        {/* Navigation - Scrollable Area */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-8 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <nav className="space-y-0.5">
                {group.items.map(({ href, label, icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`
                        flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <span className={`mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {icon}
                      </span>
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer / User Info (Optional) */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Administrator</p>
              <p className="text-xs text-gray-400">System Config</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 min-w-0">
        {/* Top Bar Spacer if needed, or just content padding */}
        <div className="p-8">
          {children}
        </div>
      </main>

    </div>
  );
}

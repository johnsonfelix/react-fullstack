'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Layers, Truck, Users, Folder, Currency, DollarSign, Weight, CreditCard, Ship } from 'lucide-react';

const links = [
  { href: '/administration/address', label: 'Address', icon: <MapPin size={18} /> },
  { href: '/administration/categories', label: 'Categories', icon: <Layers size={18} /> },
  { href: '/administration/suppliers', label: 'Suppliers', icon: <Truck size={18} /> },
  { href: '/administration/supplier-groups', label: 'Supplier Groups', icon: <Users size={18} /> },
  { href: '/administration/projects', label: 'Projects', icon: <Folder size={18} /> },
  { href: '/administration/fields/currency', label: 'Currency', icon: <DollarSign size={18} /> },
  { href: '/administration/fields/uom', label: 'UOM', icon: <Weight size={18} /> },
  { href: '/administration/fields/payment', label: 'Payment', icon: <CreditCard size={18} /> },
  { href: '/administration/fields/urgency', label: 'Urgency', icon: <Folder size={18} /> },
  { href: '/administration/fields/shipping', label: 'Shipping', icon: <Ship size={18} /> },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 shadow-md">
        <h2 className="text-xl font-bold mb-6">Administration</h2>
        <nav className="space-y-2">
          {links.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{icon}</span> {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 bg-gray-50 pt-16">{children}</main>

    </div>
  );
}

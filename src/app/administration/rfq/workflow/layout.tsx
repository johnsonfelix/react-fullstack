// app/admin/workflow/layout.tsx
"use client";
import React from "react";
import Link from "next/link";

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { href: "/administration/rfq/workflow/approval", label: "Event Approval" },
    { href: "/administration/rfq/workflow/award", label: "Award Approval" },
    { href: "/administration/rfq/workflow/modification", label: "Modification Rules" },
    { href: "/administration/rfq/workflow/pause", label: "Pause Reasons" },
    { href: "/administration/rfq/workflow/config", label: "Global Config" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">Workflow Administration</h1>
          <p className="text-sm text-gray-600">Manage approval rules, modifications, pause reasons and system config</p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3">
            <nav className="bg-white p-4 rounded shadow">
              <ul className="space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block px-3 py-2 rounded text-sm hover:bg-gray-100"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="col-span-9">
            <div className="bg-white p-6 rounded shadow">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

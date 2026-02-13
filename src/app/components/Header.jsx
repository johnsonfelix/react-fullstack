'use client';

import React, { useEffect, useState } from "react";
import { Plus, List, ChartArea, Settings, Users, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import UserAccountnav from "./userAccountnav";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [showPopup, setShowPopup] = useState(false);

  // Prevent hydration mismatch by rendering client-only UI after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const session = useSession();
  const router = useRouter();

  const userType = session?.data?.user?.type;

  const getDashboardLink = () => {
    if (!userType) return null;

    const type = userType.toUpperCase();

    if (type === 'SUPPLIER') {
      return (
        <Link
          href="/supplier/dashboard"
          className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
        >
          <LayoutDashboard className="w-5 h-5 mr-1" /> Dashboard
        </Link>
      );
    }

    if (type === 'APPROVER') {
      return (
        <Link
          href="/approver-dashboard"
          className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
        >
          <LayoutDashboard className="w-5 h-5 mr-1" /> Dashboard
        </Link>
      );
    }

    if (type === 'ADMIN') {
      return (
        <Link
          href="/administration/address"
          className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
        >
          <Settings className="w-5 h-5 mr-1" /> Administration
        </Link>
      );
    }

    return null;
  };

  return (
    <>
      <header className="backdrop-blur-md bg-white/30 shadow-lg fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <div className="flex-shrink-0 text-xl font-bold text-indigo-600">
              Logo
            </div>

            {/* Middle Section */}
            <div className="flex items-center space-x-6">

              {/* Intake Button */}
              <button
                onClick={() => router.push("/intake/new")}
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                Intake
              </button>

              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-6 items-center">
                <Link
                  href="/events"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  <List className="w-5 h-5 mr-1" /> Events
                </Link>

                <Link
                  href="#services"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  <ChartArea className="w-5 h-5 mr-1" /> Analytics
                </Link>

                <Link
                  href="/requests"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium"
                >
                  <List className="w-5 h-5 mr-1" /> Requests
                </Link>

                {getDashboardLink()}

                <button
                  onClick={() => router.push("/administration/supplier-invite")}
                  className="flex items-center border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full shadow transition"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Supplier Invite
                </button>

                {/* Create Button (opens popup) */}
                <button
                  onClick={() => setShowPopup(true)}
                  className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow transition"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create
                </button>
              </nav>
            </div>

            {/* Right Section: Account or Sign In */}
            <div>
              {mounted ? (
                session.status === "authenticated" ? (
                  <UserAccountnav />
                ) : (
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
                  >
                    Sign In
                  </Link>
                )
              ) : (
                <div className="w-[104px] h-10 rounded-md bg-gray-100/50" aria-hidden />
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Popup Overlay */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-lg w-96 p-6 relative">
            {/* Heading */}
            <h2 id="create-modal-title" className="text-xl font-bold mb-4">What would you like to create</h2>

            <div className="flex flex-col gap-4">

              {/* RFQ Card */}
              <div
                onClick={() => {
                  setShowPopup(false); // close popup
                  router.push('/buyer/events/create'); // navigate
                }}
                className="cursor-pointer border rounded-lg p-4 shadow-sm hover:bg-gray-50 transition"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setShowPopup(false); router.push('/buyer/events/create'); } }}
              >
                <h3 className="text-lg font-semibold">Request for Quote (RFQ)</h3>
                <p className="text-gray-600 mt-2">
                  Request pricing for goods and services.
                </p>
              </div>

              {/* RFP Card */}
              <div
                onClick={() => {
                  setShowPopup(false); // close popup
                  router.push('/procurement/new'); // navigate
                }}
                className="cursor-pointer border rounded-lg p-4 shadow-sm hover:bg-gray-50 transition"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setShowPopup(false); router.push('/procurement/new'); } }}
              >
                <h3 className="text-lg font-semibold">Request for Proposal (RFP)</h3>
                <p className="text-gray-600 mt-2">
                  Request information about goods and services for a specific project.
                </p>
              </div>

            </div>

            {/* Cancel Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPopup(false)}
                className="text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

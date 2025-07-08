'use client'

import React, { useState } from 'react';
import { Plus, List, ChartArea, Settings } from 'lucide-react';
import Link from 'next/link';
import UserAccountnav from './userAccountnav';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [showPopup, setShowPopup] = useState(false);

  const session = useSession();

  const router =useRouter();
  
  

  return (
    <>
      <header className="backdrop-blur-md bg-white/30 shadow-lg fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 text-xl font-bold text-indigo-600">
              Logo
            </div>

            {/* Middle Section - Create Button and Navigation */}
            <div className="flex items-center space-x-6">
              {/* Create Button */}
              <button
                onClick={() => setShowPopup(true)}
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow transition"
              >
                <Plus className="w-4 h-4 mr-2" /> Create
              </button>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-6 items-center">
                <Link href="/events" className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium">
                  <List className="w-5 h-5 mr-1" /> Events
                </Link>
                <Link href="#services" className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium">
                  <ChartArea className="w-5 h-5 mr-1" /> Analytics
                </Link>
                <Link href="/administration/address" className="flex items-center text-gray-700 hover:text-indigo-600 transition font-medium">
                  <Settings className="w-5 h-5 mr-1" /> Administration
                </Link>
              </nav>
            </div>

            {/* Sign In Button */}
            {/* Sign In Button */}
          <div>
          {session.status == 'authenticated' ?(
            <UserAccountnav/>
          ):(
            <Link href="/sign-in" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition shadow">
          Sign In
          </Link>
          )}
          </div>

          </div>
        </div>
      </header>

      {/* Popup Overlay */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl shadow-lg w-96 p-6 relative">
            {/* Heading */}
            <h2 className="text-xl font-bold mb-4">What would you like to create</h2>

            <div className="flex flex-col gap-4">

            {/* Card */}
            <div
                onClick={() => {
                  setShowPopup(false); // close popup
                  router.push('/buyer/events/create'); // navigate
                }}
                className="cursor-pointer border rounded-lg p-4 shadow-sm hover:bg-gray-50 transition"
              >
                <h3 className="text-lg font-semibold">Request for Quote (RFQ)</h3>
                <p className="text-gray-600 mt-2">
                  Request pricing for goods and services.
                </p>
              </div>


              {/* Card */}
            <div
                onClick={() => {
                  setShowPopup(false); // close popup
                  router.push('/procurement/new'); // navigate
                }}
                className="cursor-pointer border rounded-lg p-4 shadow-sm hover:bg-gray-50 transition"
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

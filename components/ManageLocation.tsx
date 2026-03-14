import React from 'react';

export default function ManageLocation() {
  // Placeholder for location management logic
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-8 border border-zinc-800">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Manage Clinic Locations</h2>
          <p className="text-gray-300 mb-6">
            Add, edit, or view your clinic branches. This page appears only if your clinic has more than one location.
          </p>
          {/* Location management UI will go here */}
          <div className="bg-gray-800 rounded-lg p-6 text-white">
            <p className="text-green-300">Location management coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

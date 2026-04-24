import { useState } from 'react';
import { Menu } from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import ParamedicalManager from './ParamedicalManager';

interface Props {
  clinicId: string;
  clinicName: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void | Promise<void>;
  activeAddOns?: string[];
  /** When set (branch manager), allotments are tagged with this branch and history scoped to it. */
  branchId?: string;
  branchName?: string;
  isBranchManager?: boolean;
}

export default function ClinicParamedicalManagerPage({
  clinicId, clinicName, onMenuChange, onLogout, activeAddOns = [],
  branchId, branchName, isBranchManager = false,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <ClinicSidebar
        activeMenu="paramedical-manager"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-zinc-950 border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-purple-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate">Paramedical Manager</h1>
            {isBranchManager && branchName && (
              <p className="text-[11px] text-purple-300/80 mt-0.5">Branch: {branchName}</p>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {isBranchManager && branchName && (
            <div className="mb-4 bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 text-xs text-purple-200">
              You are managing <span className="font-semibold">{branchName}</span>.
              Linked paramedicals are shared across all branches of your clinic, but
              your allotments and allotment history are scoped to this branch only.
            </div>
          )}
          {clinicId ? (
            <ParamedicalManager
              ownerType="clinic"
              ownerId={clinicId}
              ownerName={clinicName || 'Clinic'}
              accent="purple"
              branchId={branchId}
              branchName={branchName}
              scopeHistoryToBranch={isBranchManager}
            />
          ) : (
            <p className="text-gray-500 text-sm">Loading...</p>
          )}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import ParamedicalManager from './ParamedicalManager';
import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

export default function DoctorParamedicalManagerPage({
  onMenuChange = () => {},
  onLogout,
  activeAddOns = [],
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('Doctor');

  useEffect(() => {
    const id = localStorage.getItem('userId') || '';
    setDoctorId(id);
    (async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'doctors', id));
        if (snap.exists()) {
          const d: any = snap.data();
          const name = d.name || d.fullName || '';
          setDoctorName(name ? `Dr. ${name.replace(/^Dr\.?\s+/i, '')}` : 'Doctor');
        }
      } catch (err) { console.error('Doctor load error:', err); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DashboardSidebar
        activeMenu="paramedical-manager"
        onMenuChange={(m) => onMenuChange(m)}
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
            <Menu className="w-5 h-5 text-emerald-500" />
          </button>
          <h1 className="text-lg md:text-xl font-bold">Paramedical Manager</h1>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {doctorId ? (
            <ParamedicalManager
              ownerType="doctor"
              ownerId={doctorId}
              ownerName={doctorName}
              accent="emerald"
            />
          ) : (
            <p className="text-gray-500 text-sm">Loading...</p>
          )}
        </main>
      </div>
    </div>
  );
}

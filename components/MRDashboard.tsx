import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Menu, X } from 'lucide-react';
import MRSidebar from './MRSidebar';
import MRDashboardHome from './MRDashboardHome';
import MRMyDoctors from './MRMyDoctors';
import MRVisitReports from './MRVisitReports';
import MRProfile from './MRProfile';
import MRRequestStatus from './MRRequestStatus';
import MRBookingList from './MRBookingList';
import MRLiveQueue from './MRLiveQueue';
import { ProfessionalVisitModal } from './ProfessionalVisitModal';
import { MRPatientBookingModal } from './MRPatientBookingModal';
import healqrLogo from '../assets/healqr.logo.png';

interface MRData { name: string; email: string; phone: string; company: string; division: string; }

export default function MRDashboard({ onLogout }: { onLogout?: () => void }) {
  const [mrData, setMrData] = useState<MRData | null>(null);
  const [mrLinks, setMrLinks] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals state
  const [activeVisitLink, setActiveVisitLink] = useState<any | null>(null);
  const [activePatientBookingLink, setActivePatientBookingLink] = useState<any | null>(null);

  const mrId = localStorage.getItem('userId');

  useEffect(() => {
    if (!mrId || !db) return;
    getDoc(doc(db, 'medicalReps', mrId)).then(s => { if (s.exists()) setMrData(s.data() as MRData); });
  }, [mrId]);

  useEffect(() => {
    if (!mrId || !db) return;
    const q = query(collection(db, 'mrDoctorLinks'), where('mrId', '==', mrId));
    const unsub = onSnapshot(q, s => {
      const links = s.docs.map(d => ({ id: d.id, ...d.data() }));
      links.sort((a: any, b: any) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setMrLinks(links);
    }, err => console.error('mrDoctorLinks listener error:', err));
    return () => unsub();
  }, [mrId]);

  // Handle routing
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <MRDashboardHome mrId={mrId || ''} mrData={mrData} mrLinks={mrLinks} onMenuChange={setActiveMenu} />;
      case 'my-doctors':
        return <MRMyDoctors mrId={mrId || ''} mrData={mrData} mrLinks={mrLinks} setMrLinks={setMrLinks} onOpenVisitModal={setActiveVisitLink} onOpenPatientModal={setActivePatientBookingLink} />;
      case 'reports':
        return <MRVisitReports mrId={mrId || ''} />;
      case 'profile':
        return <MRProfile mrId={mrId || ''} />;
      case 'my-requests':
        return <MRRequestStatus mrId={mrId || ''} />;
      case 'todays-schedule':
        return <MRBookingList mrId={mrId || ''} type="today" />;
      case 'advance-booking':
        return <MRBookingList mrId={mrId || ''} type="advance" />;
      case 'special-booking':
        return <div className="text-gray-400 p-8 text-center">Special Bookings can be requested from the "Professional Visit" flow under "My Doctors" by checking the "Special Request" box when your regular frequency limit is reached.</div>;
      case 'live-queue':
        return <MRLiveQueue mrId={mrId || ''} />;
      default:
        return <MRDashboardHome mrId={mrId || ''} mrData={mrData} mrLinks={mrLinks} onMenuChange={setActiveMenu} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex select-none">
      <MRSidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          setIsSidebarOpen(false);
        }}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

        {/* Top Header */}
        <header className="h-16 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <img src={healqrLogo} alt="HealQR" className="h-8 w-auto" />
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <h1 className="text-lg font-bold text-white tracking-tight capitalize">
                {activeMenu.replace('-', ' ')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Add notification or other header items here if needed */}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderContent()}
        </main>
      </div>

      <ProfessionalVisitModal
        isOpen={!!activeVisitLink}
        onClose={() => setActiveVisitLink(null)}
        mrId={mrId || ''}
        mrData={mrData}
        doctorLink={activeVisitLink}
      />

      <MRPatientBookingModal
        isOpen={!!activePatientBookingLink}
        onClose={() => setActivePatientBookingLink(null)}
        mrData={mrData}
        doctorLink={activePatientBookingLink}
      />
    </div>
  );
}

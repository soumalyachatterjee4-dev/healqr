import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, FileText, Video, Link2, FileType, ExternalLink, ArrowLeft, Loader2, Menu } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { Button } from './ui/button';

interface CMEContent {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'link' | 'article';
  url: string;
  specialty: string;
  createdAt: any;
  isActive: boolean;
}

interface DoctorCMEViewerProps {
  onBack: () => void;
  companyName: string;
  doctorName: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

export default function DoctorCMEViewer({ onBack, companyName, doctorName, onMenuChange = () => {}, onLogout, activeAddOns = [] }: DoctorCMEViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [content, setContent] = useState<CMEContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadCMEContent();
  }, [companyName]);

  const loadCMEContent = async () => {
    if (!companyName) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    try {
      // Find company doc by name
      const companiesSnap = await getDocs(
        query(collection(db, 'pharmaCompanies'), where('companyName', '==', companyName), where('status', '==', 'active'))
      );

      if (companiesSnap.empty) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      // Check if CME is enabled for this doctor
      const userId = localStorage.getItem('userId') || '';
      let cmeEnabled = false;
      let foundCompanyId = '';

      for (const compDoc of companiesSnap.docs) {
        const doctorSnap = await getDocs(
          query(collection(db, 'pharmaCompanies', compDoc.id, 'distributedDoctors'), where('doctorId', '==', userId))
        );
        if (!doctorSnap.empty) {
          const doctorData = doctorSnap.docs[0].data();
          if (doctorData.cmeEnabled) {
            cmeEnabled = true;
            foundCompanyId = compDoc.id;
            break;
          }
        }
      }

      if (!cmeEnabled) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      setEnabled(true);
      setCompanyId(foundCompanyId);

      // Load active CME content
      const contentSnap = await getDocs(
        query(
          collection(db, 'pharmaCompanies', foundCompanyId, 'cmeContent'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        )
      );

      setContent(contentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMEContent)));
    } catch (err) {
      console.error('Error loading CME content:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      case 'video': return <Video className="w-5 h-5 text-blue-400" />;
      case 'link': return <Link2 className="w-5 h-5 text-emerald-400" />;
      case 'article': return <FileType className="w-5 h-5 text-purple-400" />;
      default: return <BookOpen className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-500/20 text-red-400';
      case 'video': return 'bg-blue-500/20 text-blue-400';
      case 'link': return 'bg-emerald-500/20 text-emerald-400';
      case 'article': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredContent = filterType === 'all' ? content : content.filter(c => c.type === filterType);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeMenu="pharma-cme" onMenuChange={onMenuChange} onLogout={onLogout} activeAddOns={activeAddOns} />
        <div className="lg:pl-64">
          <div className="flex flex-col items-center justify-center p-6 min-h-screen">
            <div className="text-center space-y-4">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto" />
              <h2 className="text-xl font-bold text-white">CME Content Not Available</h2>
              <p className="text-gray-400 max-w-md">
                {!companyName
                  ? 'You are not linked to any pharma company.'
                  : 'Your pharma company has not enabled CME content access for your account.'}
              </p>
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeMenu="pharma-cme" onMenuChange={onMenuChange} onLogout={onLogout} activeAddOns={activeAddOns} />
      <div className="lg:pl-64">
        {/* Sticky Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-emerald-500" />
                  CME Content
                </h1>
                <p className="text-sm text-gray-400">Shared by {companyName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pdf', 'video', 'link', 'article'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition ${
                filterType === type
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>

        {/* Content list */}
        {filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {filterType !== 'all' ? `No ${filterType} content available` : 'No CME content available yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContent.map(item => (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeBadgeColor(item.type)}`}>
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                    )}
                    {item.specialty && (
                      <span className="text-xs text-gray-500">Specialty: {item.specialty}</span>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {item.type === 'pdf' ? 'View PDF' : item.type === 'video' ? 'Watch Video' : item.type === 'article' ? 'Read Article' : 'Open Link'}
                      </a>
                    </div>
                  </div>
                </div>
                {item.createdAt && (
                  <p className="text-xs text-gray-600 mt-2 text-right">
                    {item.createdAt.toDate?.()?.toLocaleDateString() || ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

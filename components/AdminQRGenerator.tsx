import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { 
  QrCode, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
// @ts-ignore
import QRCode from 'qrcode';

interface GeneratedQR {
  id: string;
  code: string;
  status: 'unused' | 'active';
  linkedEmail: string | null;
  activatedAt: any;
  doctorId: string | null;
  createdAt: any;
  printBatch: string;
}

export default function AdminQRGenerator() {
  const [batchSize, setBatchSize] = useState(100);
  const [batchPrefix, setBatchPrefix] = useState('BATCH');
  const [startNumber, setStartNumber] = useState(501); // Start from 501 (1-500 reserved for testing)
  const [loading, setLoading] = useState(false);
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    unused: 0,
    active: 0
  });

  useEffect(() => {
    loadQRStats();
    loadRecentQRs();
  }, []);

  const loadQRStats = async () => {
    if (!db) return;

    try {
      const qrCollection = collection(db, 'activationCodes');
      const allQRs = await getDocs(qrCollection);
      
      let unused = 0;
      let active = 0;

      allQRs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'unused') unused++;
        if (data.status === 'active') active++;
      });

      setStats({
        total: allQRs.size,
        unused,
        active
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentQRs = async () => {
    if (!db) return;

    try {
      const qrCollection = collection(db, 'activationCodes');
      const recentQuery = query(
        qrCollection,
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(recentQuery);
      const qrs: GeneratedQR[] = [];
      
      snapshot.forEach(doc => {
        qrs.push({
          id: doc.id,
          ...doc.data()
        } as GeneratedQR);
      });

      setGeneratedQRs(qrs);
    } catch (error) {
      console.error('Error loading recent QRs:', error);
    }
  };

  const generateQRBatch = async () => {
    if (!db) {
      toast.error('Database not available');
      return;
    }

    if (batchSize < 1 || batchSize > 10000) {
      toast.error('Batch size must be between 1 and 10,000');
      return;
    }

    setLoading(true);
    const qrCollection = collection(db, 'activationCodes');
    const batchId = `${batchPrefix}_${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < batchSize; i++) {
        const qrNumber = String(startNumber + i).padStart(5, '0');
        const qrCode = `QR${qrNumber}`;

        try {
          // Check if QR code already exists
          const existingQuery = query(qrCollection, where('code', '==', qrCode));
          const existingDocs = await getDocs(existingQuery);

          if (!existingDocs.empty) {
            console.warn(`QR ${qrCode} already exists, skipping...`);
            errorCount++;
            continue;
          }

          // Create new QR code document
          await addDoc(qrCollection, {
            code: qrCode,
            status: 'unused',
            linkedEmail: null,
            activatedAt: null,
            doctorId: null,
            createdAt: serverTimestamp(),
            printBatch: batchId
          });

          successCount++;
        } catch (err) {
          console.error(`Error creating ${qrCode}:`, err);
          errorCount++;
        }
      }

      toast.success(`Generated ${successCount} QR codes`, {
        description: errorCount > 0 ? `${errorCount} codes skipped (already exist)` : undefined
      });

      // Reload stats and recent QRs
      await loadQRStats();
      await loadRecentQRs();

      // Update start number for next batch
      setStartNumber(startNumber + batchSize);

    } catch (error) {
      console.error('Error generating QR batch:', error);
      toast.error('Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async (code: string) => {
    try {
      const url = `https://teamhealqr.web.app/book?qr=${code}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 1000,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${code}.png`;
      link.click();

      toast.success(`Downloaded ${code}`);
    } catch (error) {
      console.error('Error downloading QR:', error);
      toast.error('Failed to download QR code');
    }
  };

  const downloadBatchCSV = () => {
    const csvContent = [
      ['QR Code', 'Status', 'Linked Email', 'Print Batch', 'Created At'].join(','),
      ...generatedQRs.map(qr => [
        qr.code,
        qr.status,
        qr.linkedEmail || 'N/A',
        qr.printBatch,
        qr.createdAt?.toDate?.()?.toISOString() || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr_codes_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Downloaded CSV file');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const deleteQR = async (id: string, code: string) => {
    if (!db) return;
    
    if (!confirm(`Are you sure you want to delete ${code}?`)) return;

    try {
      await deleteDoc(doc(db, 'activationCodes', id));
      toast.success(`Deleted ${code}`);
      await loadQRStats();
      await loadRecentQRs();
    } catch (error) {
      console.error('Error deleting QR:', error);
      toast.error('Failed to delete QR code');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <QrCode className="h-8 w-8 text-emerald-500" />
            Admin QR Code Generator
          </h1>
          <p className="text-gray-400">
            Generate activation QR codes for doctor onboarding
          </p>
          <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              <strong>⚠️ Note:</strong> QR codes <strong>QR00001 - QR00500</strong> are reserved for testing and demo purposes. 
              Production codes start from <strong>QR00501</strong> onwards.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total QR Codes</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <QrCode className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Unused Codes</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.unused}</p>
              </div>
              <AlertCircle className="h-12 w-12 text-emerald-500" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Codes</p>
                <p className="text-3xl font-bold text-blue-500">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Generator Form */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Generate New Batch</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                min={1}
                max={10000}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Max: 10,000 codes</p>
            </div>

            <div>
              <Label htmlFor="startNumber">Start Number</Label>
              <Input
                id="startNumber"
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 501)}
                min={1}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Production: 501+  |  Testing: 1-500
              </p>
            </div>

            <div>
              <Label htmlFor="batchPrefix">Batch Prefix</Label>
              <Input
                id="batchPrefix"
                type="text"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">For tracking batches</p>
            </div>
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4 mb-6">
            <p className="text-sm text-gray-300">
              <strong>Preview:</strong> Will generate codes from{' '}
              <span className="text-emerald-500 font-mono">
                QR{String(startNumber).padStart(5, '0')}
              </span>{' '}
              to{' '}
              <span className="text-emerald-500 font-mono">
                QR{String(startNumber + batchSize - 1).padStart(5, '0')}
              </span>
            </p>
          </div>

          <Button
            onClick={generateQRBatch}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Generate {batchSize} QR Codes
              </>
            )}
          </Button>
        </Card>

        {/* Recent QR Codes */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent QR Codes (Last 20)</h2>
            <div className="flex gap-2">
              <Button
                onClick={loadRecentQRs}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={downloadBatchCSV}
                variant="outline"
                size="sm"
                className="border-zinc-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">QR Code</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Linked Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Batch</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedQRs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No QR codes generated yet
                    </td>
                  </tr>
                ) : (
                  generatedQRs.map((qr) => (
                    <tr key={qr.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-500">{qr.code}</span>
                      </td>
                      <td className="py-3 px-4">
                        {qr.status === 'unused' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 text-sm">
                            <AlertCircle className="h-3 w-3" />
                            Unused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-500 text-sm">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {qr.linkedEmail || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {qr.printBatch}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(qr.code)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => downloadQRCode(qr.code)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {qr.status === 'unused' && (
                            <Button
                              onClick={() => deleteQR(qr.id, qr.code)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

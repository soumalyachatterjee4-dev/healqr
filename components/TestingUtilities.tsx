import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  FlaskConical, 
  Users, 
  Calendar, 
  FileText, 
  Video, 
  ShoppingCart, 
  MessageSquare,
  Activity,
  Download,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface TestingUtilitiesProps {
  onClose: () => void;
}

export default function TestingUtilities({ onClose }: TestingUtilitiesProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Test doctor accounts
  const testDoctors = Array.from({ length: 10 }, (_, i) => ({
    email: `doctor${i + 1}@healqr.test`,
    password: 'Test',
    name: `Dr. Test ${i + 1}`,
    specialty: ['Cardiology', 'Neurology', 'Pediatrics', 'Dermatology', 'Orthopedics'][i % 5]
  }));

  // Test patient data
  const testPatients = [
    { name: 'John Doe', age: 30, gender: 'Male', phone: '9876543210', email: 'john@test.com' },
    { name: 'Jane Smith', age: 25, gender: 'Female', phone: '9876543211', email: 'jane@test.com' },
    { name: 'Robert Brown', age: 40, gender: 'Male', phone: '9876543212', email: 'robert@test.com' },
    { name: 'Emily Davis', age: 35, gender: 'Female', phone: '9876543213', email: 'emily@test.com' },
    { name: 'Michael Wilson', age: 28, gender: 'Male', phone: '9876543214', email: 'michael@test.com' },
    { name: 'Sarah Johnson', age: 32, gender: 'Female', phone: '9876543215', email: 'sarah@test.com' },
    { name: 'David Lee', age: 45, gender: 'Male', phone: '9876543216', email: 'david@test.com' },
    { name: 'Lisa Chen', age: 27, gender: 'Female', phone: '9876543217', email: 'lisa@test.com' },
    { name: 'James Taylor', age: 38, gender: 'Male', phone: '9876543218', email: 'james@test.com' },
    { name: 'Maria Garcia', age: 33, gender: 'Female', phone: '9876543219', email: 'maria@test.com' }
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadTestData = () => {
    const testData = {
      doctors: testDoctors,
      patients: testPatients,
      testPlan: {
        totalDoctors: 10,
        totalPatients: 100,
        bookingsPerDoctor: 10,
        testDate: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'healqr-test-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const testChecklist = [
    { icon: Users, label: 'Doctor Signup', count: '10 doctors', color: 'text-blue-600' },
    { icon: Calendar, label: 'Patient Booking', count: '100 bookings', color: 'text-green-600' },
    { icon: FileText, label: 'RX Upload', count: '100 prescriptions', color: 'text-purple-600' },
    { icon: Video, label: 'Video Calls', count: '30 consultations', color: 'text-red-600' },
    { icon: ShoppingCart, label: 'E-commerce', count: '50 purchases', color: 'text-orange-600' },
    { icon: MessageSquare, label: 'Chat System', count: '20 conversations', color: 'text-cyan-600' },
    { icon: Activity, label: 'AI RX Reader', count: '50 scans', color: 'text-pink-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl text-gray-900">HealQR Testing Utilities</h1>
              <p className="text-sm text-gray-600">100-User Test Helper Tools</p>
            </div>
          </div>
          <Button onClick={onClose} variant="outline">Close Testing Mode</Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-orange-900">
              <strong>Testing Mode Active:</strong> This is a testing environment. All data is for testing purposes only. 
              Payment gateway is in TEST MODE. No real charges will be processed.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Checklist */}
        <Card className="p-6">
          <h2 className="text-lg mb-4 text-gray-900">Test Checklist</h2>
          <div className="space-y-3">
            {testChecklist.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-600">{item.count}</p>
                </div>
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg mb-4 text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            <Button 
              onClick={downloadTestData} 
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Test Data (JSON)
            </Button>
            
            <Button 
              onClick={() => window.open('/TESTING_GUIDE.md', '_blank')} 
              className="w-full justify-start"
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Testing Guide
            </Button>

            <Button 
              onClick={() => {
                const url = window.location.origin;
                copyToClipboard(url, 'url');
              }}
              className="w-full justify-start"
              variant="outline"
            >
              {copied === 'url' ? (
                <Check className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy Test URL
            </Button>
          </div>
        </Card>

        {/* Test Doctor Accounts */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-gray-900">Test Doctor Accounts (10)</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const doctorList = testDoctors.map(d => `${d.email} | ${d.password}`).join('\n');
                copyToClipboard(doctorList, 'doctors');
              }}
            >
              {copied === 'doctors' ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {testDoctors.map((doctor, index) => (
              <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{doctor.name}</p>
                    <p className="text-xs text-gray-600">{doctor.specialty}</p>
                    <p className="text-xs text-blue-600 mt-1 truncate">{doctor.email}</p>
                    <p className="text-xs text-gray-500">Password: {doctor.password}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 flex-shrink-0"
                    onClick={() => copyToClipboard(`${doctor.email}\n${doctor.password}`, `doctor-${index}`)}
                  >
                    {copied === `doctor-${index}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Test Patient Data */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-gray-900">Test Patient Data (10 per doctor = 100 total)</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const patientList = testPatients.map(p => 
                  `${p.name} | ${p.age} | ${p.gender} | ${p.phone} | ${p.email}`
                ).join('\n');
                copyToClipboard(patientList, 'patients');
              }}
            >
              {copied === 'patients' ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {testPatients.map((patient, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{patient.name}</p>
                    <p className="text-xs text-gray-600">{patient.age}y • {patient.gender}</p>
                    <p className="text-xs text-green-600 mt-1">{patient.phone}</p>
                    <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 flex-shrink-0"
                    onClick={() => copyToClipboard(
                      `${patient.name}\n${patient.age}\n${patient.gender}\n${patient.phone}\n${patient.email}`,
                      `patient-${index}`
                    )}
                  >
                    {copied === `patient-${index}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3 p-3 bg-gray-50 rounded">
            💡 <strong>Tip:</strong> Use each patient data 10 times (once per doctor) to create 100 total bookings
          </p>
        </Card>

        {/* System Status */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg mb-4 text-gray-900">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl text-green-600 mb-1">✅</p>
              <p className="text-sm text-gray-900">Frontend</p>
              <p className="text-xs text-gray-600">90+ Components</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl text-green-600 mb-1">✅</p>
              <p className="text-sm text-gray-900">Database</p>
              <p className="text-xs text-gray-600">Firestore Ready</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl text-green-600 mb-1">✅</p>
              <p className="text-sm text-gray-900">Auth</p>
              <p className="text-xs text-gray-600">Firebase Auth</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl text-yellow-600 mb-1">⚠️</p>
              <p className="text-sm text-gray-900">Payment</p>
              <p className="text-xs text-gray-600">Test Mode</p>
            </div>
          </div>
        </Card>

        {/* Test Progress Tracker */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg mb-4 text-gray-900">Test Progress Tracker</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Doctor Signups</span>
                <span className="text-gray-600">0 / 10</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-0 transition-all"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Patient Bookings</span>
                <span className="text-gray-600">0 / 100</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 w-0 transition-all"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Features Tested</span>
                <span className="text-gray-600">0 / 9</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 w-0 transition-all"></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4 p-3 bg-blue-50 rounded">
            📊 <strong>Goal:</strong> Complete all tests with 90%+ success rate
          </p>
        </Card>
      </div>

      {/* Data Cleanup Utility */}
      <div className="max-w-6xl mx-auto px-4">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Data Cleanup Tool</h2>
              <p className="text-sm text-red-700 mb-4">
                <strong>Issue:</strong> Some bookings may have <code className="bg-red-200 px-1 rounded">chamberId: null</code> which prevents them from appearing in chamber views.
                <br />
                <strong>Solution:</strong> Run this cleanup to update all null chamberIds to -1 (invalid chamber marker).
              </p>
              <Button 
                onClick={async () => {
                  const confirmed = confirm('⚠️ This will update ALL bookings with chamberId=null to chamberId=-1. Continue?');
                  if (!confirmed) return;
                  
                  try {
                    const { db } = await import('../lib/firebase/config');
                    const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
                    
                    if (!db) {
                      alert('❌ Firestore not initialized');
                      return;
                    }
                    
                    const bookingsRef = collection(db, 'bookings');
                    const nullChamberQuery = query(bookingsRef, where('chamberId', '==', null));
                    const snapshot = await getDocs(nullChamberQuery);
                    
                    
                    let updated = 0;
                    for (const docSnap of snapshot.docs) {
                      await updateDoc(doc(db, 'bookings', docSnap.id), {
                        chamberId: -1
                      });
                      updated++;
                    }
                    
                    alert(`✅ Updated ${updated} bookings! Null chamberIds changed to -1.`);
                  } catch (error) {
                    console.error('Error during cleanup:', error);
                    alert(`❌ Error: ${error}`);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                🔧 Fix Null ChamberID Values
              </Button>
              <Button
                onClick={async () => {
                  const confirmed = confirm('⚠️ This will mark ALL bookings as NOT cancelled (isCancelled: false, status: confirmed). Continue?');
                  if (!confirmed) return;
                  
                  try {
                    const { db } = await import('../lib/firebase/config');
                    const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
                    
                    if (!db) {
                      alert('❌ Firestore not initialized');
                      return;
                    }
                    
                    const bookingsRef = collection(db, 'bookings');
                    const snapshot = await getDocs(bookingsRef);
                    
                    
                    let updated = 0;
                    for (const docSnap of snapshot.docs) {
                      const data = docSnap.data();
                      if (data.isCancelled === true || data.status === 'cancelled') {
                        await updateDoc(doc(db, 'bookings', docSnap.id), {
                          isCancelled: false,
                          status: 'confirmed'
                        });
                        updated++;
                      }
                    }
                    
                    alert(`✅ Fixed ${updated} cancelled bookings! All marked as active/confirmed.`);
                  } catch (error) {
                    console.error('Error during fix:', error);
                    alert(`❌ Error: ${error}`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white mt-3"
              >
                ✅ Fix Cancelled Bookings
              </Button>
              <p className="text-xs text-red-600 mt-3">
                ⚠️ Run this ONLY if you see "0 bookings" in chamber views despite having bookings. Backup your data first!
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center">
          <p className="text-lg mb-2">🚀 Ready for 100-User Test!</p>
          <p className="text-sm text-blue-100">
            All systems operational • Testing utilities loaded • Good luck! 🎯
          </p>
        </div>
      </div>
    </div>
  );
}


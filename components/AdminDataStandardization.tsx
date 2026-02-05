import React, { useState } from 'react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-encryption-key-here';

export default function AdminDataStandardization() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const decryptPhone = (encrypted: string): string => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  };

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
  };

  const standardizeBookings = async () => {
    setProcessing(true);
    const stats = {
      total: 0,
      updated: 0,
      failed: 0,
      alreadyGood: 0,
      errors: [] as string[]
    };

    try {
      // Process bookings collection
      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);
      
      stats.total = snapshot.size;
      console.log(`📊 Processing ${stats.total} bookings...`);

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const updates: any = {};

        try {
          // Check if already has searchable phone
          if (data.phoneSearchable && data.whatsappNumber) {
            stats.alreadyGood++;
            continue;
          }

          // Try to get phone from any field
          let phoneNumber = '';

          // Check plain text fields
          if (data.whatsappNumber) {
            phoneNumber = data.whatsappNumber;
          } else if (data.patientPhone) {
            phoneNumber = data.patientPhone;
          } else if (data.phone) {
            phoneNumber = data.phone;
          }
          // Check encrypted fields
          else if (data.whatsappNumber_encrypted) {
            phoneNumber = decryptPhone(data.whatsappNumber_encrypted);
          } else if (data.patientPhone_encrypted) {
            phoneNumber = decryptPhone(data.patientPhone_encrypted);
          } else if (data.phone_encrypted) {
            phoneNumber = decryptPhone(data.phone_encrypted);
          }

          if (!phoneNumber) {
            stats.errors.push(`${docSnapshot.id}: No phone number found`);
            stats.failed++;
            continue;
          }

          // Normalize phone
          const normalized = normalizePhone(phoneNumber);
          if (normalized.length !== 10) {
            stats.errors.push(`${docSnapshot.id}: Invalid phone ${phoneNumber}`);
            stats.failed++;
            continue;
          }

          // Create standardized fields
          updates.whatsappNumber = `+91${normalized}`;
          updates.phoneSearchable = normalized;
          
          // Update document
          await updateDoc(doc(db, 'bookings', docSnapshot.id), updates);
          stats.updated++;

        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`${docSnapshot.id}: ${error.message}`);
        }
      }

      setResults(stats);
      console.log('✅ Standardization complete:', stats);

    } catch (error: any) {
      console.error('❌ Standardization failed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Data Standardization Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            <strong>⚠️ This tool will:</strong>
          </p>
          <ul className="text-sm text-yellow-400 mt-2 space-y-1 ml-4">
            <li>• Extract phone numbers from encrypted fields</li>
            <li>• Standardize to +91XXXXXXXXXX format</li>
            <li>• Add phoneSearchable field (last 10 digits)</li>
            <li>• Make all bookings searchable for login</li>
          </ul>
        </div>

        <Button
          onClick={standardizeBookings}
          disabled={processing}
          className="w-full"
          size="lg"
        >
          {processing ? 'Processing...' : 'Standardize All Bookings'}
        </Button>

        {results && (
          <div className="space-y-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <h3 className="font-semibold text-emerald-400 mb-2">Results:</h3>
              <div className="space-y-1 text-sm">
                <p>Total Processed: {results.total}</p>
                <p className="text-emerald-400">✅ Updated: {results.updated}</p>
                <p className="text-blue-400">✓ Already Good: {results.alreadyGood}</p>
                <p className="text-red-400">❌ Failed: {results.failed}</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="font-semibold text-red-400 mb-2">Errors:</h3>
                <ul className="text-xs text-red-300 space-y-1">
                  {results.errors.slice(0, 20).map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                  {results.errors.length > 20 && (
                    <li className="text-red-400 font-semibold">
                      ... and {results.errors.length - 20} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

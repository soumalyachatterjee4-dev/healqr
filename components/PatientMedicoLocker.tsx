import React from 'react';
import { Lock, FolderHeart } from 'lucide-react';
import type { Language } from '../utils/translations';

interface PatientMedicoLockerProps {
  language?: Language;
}

const PatientMedicoLocker: React.FC<PatientMedicoLockerProps> = ({ language = 'english' }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-12 text-center border border-orange-500/20">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <FolderHeart className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Medico Locker</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Your personal medical records locker will be available once you create a full account.
          Store prescriptions, lab reports, and medical documents securely.
        </p>
        <div className="inline-flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg">
          <Lock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Feature locked - Account activation required</span>
        </div>
        <div className="mt-8">
          <button 
            disabled
            className="bg-orange-500/50 text-white px-6 py-3 rounded-lg font-medium cursor-not-allowed opacity-50"
          >
            Activate Account to Unlock
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientMedicoLocker;


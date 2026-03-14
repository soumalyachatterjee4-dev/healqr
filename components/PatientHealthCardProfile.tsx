import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Activity, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Droplet, 
  Ruler, 
  Weight, 
  Target,
  Edit2,
  Save,
  X,
  Check
} from 'lucide-react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import DashboardPromoDisplay from './DashboardPromoDisplay';

interface HealthCardData {
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  bloodGroup: string;
  height: string;
  weight: string;
  emergencyContact: string;
  allergies: string;
  chronicConditions: string;
  mission: string;
  bio: string;
}

const PatientHealthCardProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [healthData, setHealthData] = useState<HealthCardData>({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    emergencyContact: '',
    allergies: '',
    chronicConditions: '',
    mission: 'Stay healthy, stay happy!',
    bio: 'Living a balanced life with focus on wellness and preventive care.'
  });

  useEffect(() => {
    loadHealthCardData();
  }, []);

  const loadHealthCardData = async () => {
    try {
      const patientPhone = localStorage.getItem('patient_phone');
      const demoMode = localStorage.getItem('patient_demo_mode') === 'true';

      if (demoMode || !patientPhone) {
        // Check if demo data has been edited and saved in localStorage
        const savedDemoHealthCard = localStorage.getItem('demo_health_card');
        if (savedDemoHealthCard) {
          setHealthData(JSON.parse(savedDemoHealthCard));
          return;
        }
        
        // Default demo data
        setHealthData({
          name: 'Rahul Sharma',
          phone: '+91 98765 43210',
          email: 'rahul.sharma@example.com',
          age: '32',
          gender: 'Male',
          bloodGroup: 'O+',
          height: '175 cm',
          weight: '72 kg',
          emergencyContact: '+91 98765 43211',
          allergies: 'Penicillin, Pollen',
          chronicConditions: 'None',
          mission: 'Mission to be fit and healthy every day!',
          bio: 'Passionate about maintaining a healthy lifestyle through regular exercise, balanced nutrition, and preventive healthcare. Committed to staying active and making wellness a priority.'
        });
        return;
      }

      const db = getFirestore();
      const healthCardRef = doc(db, 'patientHealthCards', patientPhone);
      const healthCardSnap = await getDoc(healthCardRef);

      if (healthCardSnap.exists()) {
        setHealthData(healthCardSnap.data() as HealthCardData);
      } else {
        // Load from bookings for initial data
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('patientPhone', '==', patientPhone), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const latestBooking = snapshot.docs[0].data();
          setHealthData(prev => ({
            ...prev,
            name: latestBooking.patientName || '',
            phone: latestBooking.patientPhone || '',
            age: latestBooking.patientAge || '',
            gender: latestBooking.patientGender || '',
            email: latestBooking.patientEmail || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading health card:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patientPhone = localStorage.getItem('patient_phone');
      const demoMode = localStorage.getItem('patient_demo_mode') === 'true';

      if (demoMode) {
        // Save to localStorage for demo mode
        localStorage.setItem('demo_health_card', JSON.stringify(healthData));
      } else if (patientPhone) {
        // Save to Firestore for real users
        const db = getFirestore();
        const healthCardRef = doc(db, 'patientHealthCards', patientPhone);
        await setDoc(healthCardRef, {
          ...healthData,
          updatedAt: new Date().toISOString()
        });
      }

      setIsEditing(false);
      setSaving(false);
    } catch (error) {
      console.error('Error saving health card:', error);
      setSaving(false);
    }
  };

  const handleChange = (field: keyof HealthCardData, value: string) => {
    setHealthData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateBMI = () => {
    if (healthData.height && healthData.weight) {
      const heightInM = parseInt(healthData.height) / 100;
      const weightInKg = parseInt(healthData.weight);
      const bmi = weightInKg / (heightInM * heightInM);
      return bmi.toFixed(1);
    }
    return '-';
  };

  const getBMIStatus = (bmi: string) => {
    const bmiNum = parseFloat(bmi);
    if (bmiNum < 18.5) return { label: 'Underweight', color: 'text-yellow-500' };
    if (bmiNum < 25) return { label: 'Normal', color: 'text-green-500' };
    if (bmiNum < 30) return { label: 'Overweight', color: 'text-orange-500' };
    return { label: 'Obese', color: 'text-red-500' };
  };

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus(bmi);

  return (
    <div className="space-y-6">
      {/* Health Tip Card */}
      <DashboardPromoDisplay category="health-tip" placement="patient-health-card" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-orange-500" />
            My Health Card
          </h2>
          <p className="text-gray-400 mt-1">Your complete health profile</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={saving}
          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
            isEditing
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saving ? (
            <>
              <Activity className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-5 h-5" />
              Edit Profile
            </>
          )}
        </button>
      </div>

      {/* Mission & Bio Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-8 h-8" />
              <h3 className="text-2xl font-bold">My Health Mission</h3>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={healthData.mission}
                onChange={(e) => handleChange('mission', e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white text-xl font-semibold placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Your health mission..."
              />
            ) : (
              <p className="text-xl font-semibold italic">&ldquo;{healthData.mission}&rdquo;</p>
            )}

            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <User className="w-5 h-5" />
                About Me
              </h4>
              {isEditing ? (
                <textarea
                  value={healthData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Tell us about your health journey..."
                />
              ) : (
                <p className="text-orange-50 leading-relaxed">{healthData.bio}</p>
              )}
            </div>
          </div>
          <div className="hidden lg:block ml-8">
            <div className="w-40 h-40 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-20 h-20 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-orange-500/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-orange-500" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Full Name"
            value={healthData.name}
            onChange={(val) => handleChange('name', val)}
            isEditing={isEditing}
            icon={<User className="w-5 h-5 text-orange-500" />}
          />
          <InputField
            label="Phone Number"
            value={healthData.phone}
            onChange={(val) => handleChange('phone', val)}
            isEditing={isEditing}
            icon={<Phone className="w-5 h-5 text-orange-500" />}
          />
          <InputField
            label="Email Address"
            value={healthData.email}
            onChange={(val) => handleChange('email', val)}
            isEditing={isEditing}
            icon={<Mail className="w-5 h-5 text-orange-500" />}
          />
          <InputField
            label="Age"
            value={healthData.age}
            onChange={(val) => handleChange('age', val)}
            isEditing={isEditing}
            icon={<Calendar className="w-5 h-5 text-orange-500" />}
          />
          <SelectField
            label="Gender"
            value={healthData.gender}
            onChange={(val) => handleChange('gender', val)}
            isEditing={isEditing}
            options={['Male', 'Female', 'Other']}
          />
          <SelectField
            label="Blood Group"
            value={healthData.bloodGroup}
            onChange={(val) => handleChange('bloodGroup', val)}
            isEditing={isEditing}
            options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
            icon={<Droplet className="w-5 h-5 text-orange-500" />}
          />
        </div>
      </div>

      {/* Health Metrics */}
      <div className="bg-gray-800 rounded-xl p-6 border border-orange-500/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-500" />
          Health Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InputField
            label="Height (cm)"
            value={healthData.height}
            onChange={(val) => handleChange('height', val)}
            isEditing={isEditing}
            icon={<Ruler className="w-5 h-5 text-orange-500" />}
            type="number"
          />
          <InputField
            label="Weight (kg)"
            value={healthData.weight}
            onChange={(val) => handleChange('weight', val)}
            isEditing={isEditing}
            icon={<Weight className="w-5 h-5 text-orange-500" />}
            type="number"
          />
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">BMI</label>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{bmi}</span>
                <span className={`text-sm font-semibold ${bmiStatus.color}`}>{bmiStatus.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-orange-500/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-orange-500" />
          Medical Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Emergency Contact"
            value={healthData.emergencyContact}
            onChange={(val) => handleChange('emergencyContact', val)}
            isEditing={isEditing}
            icon={<Phone className="w-5 h-5 text-orange-500" />}
          />
          <InputField
            label="Known Allergies"
            value={healthData.allergies}
            onChange={(val) => handleChange('allergies', val)}
            isEditing={isEditing}
            placeholder="e.g., Penicillin, Pollen"
          />
          <div className="md:col-span-2">
            <InputField
              label="Chronic Conditions"
              value={healthData.chronicConditions}
              onChange={(val) => handleChange('chronicConditions', val)}
              isEditing={isEditing}
              placeholder="e.g., Diabetes, Hypertension"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => {
              setIsEditing(false);
              loadHealthCardData();
            }}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Check className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

// Helper Components
interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: string;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  isEditing, 
  icon,
  placeholder,
  type = 'text'
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
    {isEditing ? (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
            icon ? 'pl-11' : ''
          }`}
          placeholder={placeholder}
        />
      </div>
    ) : (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 flex items-center gap-3">
        {icon}
        <span className="text-white font-medium">{value || '-'}</span>
      </div>
    )}
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  options: string[];
  icon?: React.ReactNode;
}

const SelectField: React.FC<SelectFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  isEditing, 
  options,
  icon
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
    {isEditing ? (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
            icon ? 'pl-11' : ''
          }`}
        >
          <option value="">Select {label}</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    ) : (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 flex items-center gap-3">
        {icon}
        <span className="text-white font-medium">{value || '-'}</span>
      </div>
    )}
  </div>
);

export default PatientHealthCardProfile;


/**
 * Standardized Medical Specialties for India
 * Based on Medical Council of India (MCI) / National Medical Commission (NMC) recognized specialties
 * 
 * SINGLE SOURCE OF TRUTH — import from here everywhere.
 * Do NOT hardcode specialty lists in components.
 */

export interface MedicalSpecialty {
  id: string;
  label: string;
  displayName: string; // Person-form: "Cardiologist", "General Physician"
  searchTerms: string[];
}

export const MEDICAL_SPECIALTIES: MedicalSpecialty[] = [
  { id: 'general_medicine', label: 'General Medicine (GP)', displayName: 'General Physician', searchTerms: ['gp', 'general physician', 'family doctor', 'mbbs'] },
  { id: 'cardiology', label: 'Cardiology', displayName: 'Cardiologist', searchTerms: ['heart', 'cardiac', 'cardiovascular'] },
  { id: 'dermatology', label: 'Dermatology', displayName: 'Dermatologist', searchTerms: ['skin', 'derma', 'hair', 'cosmetic'] },
  { id: 'orthopedics', label: 'Orthopedics', displayName: 'Orthopedist', searchTerms: ['bone', 'ortho', 'fracture', 'joint', 'spine'] },
  { id: 'pediatrics', label: 'Pediatrics', displayName: 'Pediatrician', searchTerms: ['child', 'kids', 'baby', 'infant', 'neonatal'] },
  { id: 'gynecology', label: 'Gynecology & Obstetrics', displayName: 'Gynecologist', searchTerms: ['gynae', 'pregnancy', 'women', 'obs', 'maternity'] },
  { id: 'ent', label: 'ENT (Ear, Nose, Throat)', displayName: 'ENT Specialist', searchTerms: ['ear', 'nose', 'throat', 'ent specialist'] },
  { id: 'ophthalmology', label: 'Ophthalmology', displayName: 'Ophthalmologist', searchTerms: ['eye', 'vision', 'cataract', 'retina'] },
  { id: 'dentistry', label: 'Dentistry', displayName: 'Dentist', searchTerms: ['dental', 'tooth', 'teeth', 'oral'] },
  { id: 'psychiatry', label: 'Psychiatry', displayName: 'Psychiatrist', searchTerms: ['mental', 'psychology', 'counseling', 'therapy'] },
  { id: 'neurology', label: 'Neurology', displayName: 'Neurologist', searchTerms: ['brain', 'neuro', 'nerve', 'migraine'] },
  { id: 'urology', label: 'Urology', displayName: 'Urologist', searchTerms: ['kidney', 'urinary', 'prostate', 'bladder'] },
  { id: 'gastroenterology', label: 'Gastroenterology', displayName: 'Gastroenterologist', searchTerms: ['stomach', 'digestive', 'gastro', 'liver', 'intestine'] },
  { id: 'pulmonology', label: 'Pulmonology / Chest Medicine', displayName: 'Pulmonologist', searchTerms: ['lung', 'respiratory', 'chest', 'asthma', 'tb'] },
  { id: 'nephrology', label: 'Nephrology', displayName: 'Nephrologist', searchTerms: ['kidney', 'dialysis', 'renal'] },
  { id: 'endocrinology', label: 'Endocrinology', displayName: 'Endocrinologist', searchTerms: ['diabetes', 'thyroid', 'hormone'] },
  { id: 'rheumatology', label: 'Rheumatology', displayName: 'Rheumatologist', searchTerms: ['arthritis', 'joint pain', 'autoimmune'] },
  { id: 'oncology', label: 'Oncology (Cancer)', displayName: 'Oncologist', searchTerms: ['cancer', 'tumor', 'chemotherapy'] },
  { id: 'anesthesiology', label: 'Anesthesiology', displayName: 'Anesthesiologist', searchTerms: ['anesthesia', 'pain management'] },
  { id: 'radiology', label: 'Radiology', displayName: 'Radiologist', searchTerms: ['x-ray', 'scan', 'imaging', 'ct', 'mri'] },
  { id: 'pathology', label: 'Pathology', displayName: 'Pathologist', searchTerms: ['lab', 'test', 'biopsy'] },
  { id: 'general_surgery', label: 'General Surgery', displayName: 'Surgeon', searchTerms: ['surgery', 'surgeon', 'operation'] },
  { id: 'plastic_surgery', label: 'Plastic & Cosmetic Surgery', displayName: 'Plastic Surgeon', searchTerms: ['plastic', 'cosmetic', 'aesthetic'] },
  { id: 'neurosurgery', label: 'Neurosurgery', displayName: 'Neurosurgeon', searchTerms: ['brain surgery', 'spine surgery'] },
  { id: 'cardiothoracic_surgery', label: 'Cardiothoracic Surgery', displayName: 'Cardiothoracic Surgeon', searchTerms: ['heart surgery', 'lung surgery'] },
  { id: 'pediatric_surgery', label: 'Pediatric Surgery', displayName: 'Pediatric Surgeon', searchTerms: ['child surgery'] },
  { id: 'vascular_surgery', label: 'Vascular Surgery', displayName: 'Vascular Surgeon', searchTerms: ['blood vessel', 'vein'] },
  { id: 'emergency_medicine', label: 'Emergency Medicine', displayName: 'Emergency Physician', searchTerms: ['emergency', 'trauma', 'casualty'] },
  { id: 'sports_medicine', label: 'Sports Medicine', displayName: 'Sports Medicine Specialist', searchTerms: ['sports injury', 'athlete'] },
  { id: 'physiotherapy', label: 'Physiotherapy', displayName: 'Physiotherapist', searchTerms: ['physio', 'physical therapy', 'rehab'] },
  { id: 'ayurveda', label: 'Ayurveda (BAMS)', displayName: 'Ayurveda', searchTerms: ['ayurvedic', 'bams', 'herbal'] },
  { id: 'homeopathy', label: 'Homeopathy (BHMS)', displayName: 'Homeopathy', searchTerms: ['homeopathic', 'bhms'] },
  { id: 'unani', label: 'Unani Medicine', displayName: 'Unani', searchTerms: ['unani', 'bums'] },
  { id: 'yoga', label: 'Yoga & Naturopathy', displayName: 'Yoga & Naturopathy', searchTerms: ['yoga', 'naturopathy', 'bnys'] },
  { id: 'dietetics', label: 'Dietetics & Nutrition', displayName: 'Dietitian', searchTerms: ['dietician', 'nutritionist', 'diet'] },
  { id: 'clinic', label: 'Clinic', displayName: 'Clinic', searchTerms: ['clinic', 'center', 'centre', 'polyclinic'] },
  { id: 'veterinarian', label: 'Veterinarian', displayName: 'Veterinarian', searchTerms: ['vet', 'animal', 'pet', 'dog', 'cat'] },
  { id: 'other', label: 'Other Specialty', displayName: 'Other', searchTerms: ['other', 'specialist'] },
];

/**
 * Display names for pharma/advertiser dropdowns (person-form)
 */
export const SPECIALTY_DISPLAY_NAMES: string[] = MEDICAL_SPECIALTIES.map(s => s.displayName);

// Build a lookup map for fast normalization (lowercase variants → canonical id)
const _normalizeMap = new Map<string, string>();
MEDICAL_SPECIALTIES.forEach(s => {
  _normalizeMap.set(s.id.toLowerCase(), s.id);
  _normalizeMap.set(s.label.toLowerCase(), s.id);
  _normalizeMap.set(s.displayName.toLowerCase(), s.id);
  s.searchTerms.forEach(t => _normalizeMap.set(t.toLowerCase(), s.id));
});
// Common aliases
_normalizeMap.set('orthopedic', 'orthopedics');
_normalizeMap.set('gynaecology', 'gynecology');
_normalizeMap.set('general physician', 'general_medicine');
_normalizeMap.set('general_physician', 'general_medicine');

/**
 * Normalize any specialty string to its canonical ID.
 * Handles: "Cardiologist" → "cardiology", "general_medicine" → "general_medicine",
 * "General Physician" → "general_medicine", "Orthopedic" → "orthopedics", etc.
 */
export const normalizeSpecialty = (input: string): string => {
  if (!input) return '';
  const key = input.toLowerCase().trim();
  return _normalizeMap.get(key) || input;
};

/**
 * Get specialty label by ID
 */
export const getSpecialtyLabel = (id: string): string => {
  const specialty = MEDICAL_SPECIALTIES.find(s => s.id === id);
  return specialty?.label || id;
};

/**
 * Get person-form display name by ID (e.g. "Cardiologist")
 */
export const getSpecialtyDisplayName = (id: string): string => {
  const normalized = normalizeSpecialty(id);
  const specialty = MEDICAL_SPECIALTIES.find(s => s.id === normalized);
  return specialty?.displayName || id;
};

/**
 * Format any specialty value for display — tries displayName first, falls back to label.
 * Handles raw IDs, labels, and person-form names.
 */
export const formatSpecialtyLabel = (value: string): string => {
  if (!value) return '';
  const normalized = normalizeSpecialty(value);
  const specialty = MEDICAL_SPECIALTIES.find(s => s.id === normalized);
  return specialty?.label || value;
};

/**
 * Search specialties by term (for autocomplete)
 */
export const searchSpecialties = (searchTerm: string): MedicalSpecialty[] => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return MEDICAL_SPECIALTIES;

  return MEDICAL_SPECIALTIES.filter(specialty =>
    specialty.label.toLowerCase().includes(term) ||
    specialty.displayName.toLowerCase().includes(term) ||
    specialty.searchTerms.some(st => st.includes(term))
  );
};

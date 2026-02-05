/**
 * Standardized Medical Specialties for India
 * Based on Medical Council of India (MCI) / National Medical Commission (NMC) recognized specialties
 */

export interface MedicalSpecialty {
  id: string;
  label: string;
  searchTerms: string[];
}

export const MEDICAL_SPECIALTIES: MedicalSpecialty[] = [
  { id: 'general_medicine', label: 'General Medicine (GP)', searchTerms: ['gp', 'general physician', 'family doctor', 'mbbs'] },
  { id: 'cardiology', label: 'Cardiology', searchTerms: ['heart', 'cardiac', 'cardiovascular'] },
  { id: 'dermatology', label: 'Dermatology', searchTerms: ['skin', 'derma', 'hair', 'cosmetic'] },
  { id: 'orthopedics', label: 'Orthopedics', searchTerms: ['bone', 'ortho', 'fracture', 'joint', 'spine'] },
  { id: 'pediatrics', label: 'Pediatrics', searchTerms: ['child', 'kids', 'baby', 'infant', 'neonatal'] },
  { id: 'gynecology', label: 'Gynecology & Obstetrics', searchTerms: ['gynae', 'pregnancy', 'women', 'obs', 'maternity'] },
  { id: 'ent', label: 'ENT (Ear, Nose, Throat)', searchTerms: ['ear', 'nose', 'throat', 'ent specialist'] },
  { id: 'ophthalmology', label: 'Ophthalmology', searchTerms: ['eye', 'vision', 'cataract', 'retina'] },
  { id: 'dentistry', label: 'Dentistry', searchTerms: ['dental', 'tooth', 'teeth', 'oral'] },
  { id: 'psychiatry', label: 'Psychiatry', searchTerms: ['mental', 'psychology', 'counseling', 'therapy'] },
  { id: 'neurology', label: 'Neurology', searchTerms: ['brain', 'neuro', 'nerve', 'migraine'] },
  { id: 'urology', label: 'Urology', searchTerms: ['kidney', 'urinary', 'prostate', 'bladder'] },
  { id: 'gastroenterology', label: 'Gastroenterology', searchTerms: ['stomach', 'digestive', 'gastro', 'liver', 'intestine'] },
  { id: 'pulmonology', label: 'Pulmonology / Chest Medicine', searchTerms: ['lung', 'respiratory', 'chest', 'asthma', 'tb'] },
  { id: 'nephrology', label: 'Nephrology', searchTerms: ['kidney', 'dialysis', 'renal'] },
  { id: 'endocrinology', label: 'Endocrinology', searchTerms: ['diabetes', 'thyroid', 'hormone'] },
  { id: 'rheumatology', label: 'Rheumatology', searchTerms: ['arthritis', 'joint pain', 'autoimmune'] },
  { id: 'oncology', label: 'Oncology (Cancer)', searchTerms: ['cancer', 'tumor', 'chemotherapy'] },
  { id: 'anesthesiology', label: 'Anesthesiology', searchTerms: ['anesthesia', 'pain management'] },
  { id: 'radiology', label: 'Radiology', searchTerms: ['x-ray', 'scan', 'imaging', 'ct', 'mri'] },
  { id: 'pathology', label: 'Pathology', searchTerms: ['lab', 'test', 'biopsy'] },
  { id: 'general_surgery', label: 'General Surgery', searchTerms: ['surgery', 'surgeon', 'operation'] },
  { id: 'plastic_surgery', label: 'Plastic & Cosmetic Surgery', searchTerms: ['plastic', 'cosmetic', 'aesthetic'] },
  { id: 'neurosurgery', label: 'Neurosurgery', searchTerms: ['brain surgery', 'spine surgery'] },
  { id: 'cardiothoracic_surgery', label: 'Cardiothoracic Surgery', searchTerms: ['heart surgery', 'lung surgery'] },
  { id: 'pediatric_surgery', label: 'Pediatric Surgery', searchTerms: ['child surgery'] },
  { id: 'vascular_surgery', label: 'Vascular Surgery', searchTerms: ['blood vessel', 'vein'] },
  { id: 'emergency_medicine', label: 'Emergency Medicine', searchTerms: ['emergency', 'trauma', 'casualty'] },
  { id: 'sports_medicine', label: 'Sports Medicine', searchTerms: ['sports injury', 'athlete'] },
  { id: 'physiotherapy', label: 'Physiotherapy', searchTerms: ['physio', 'physical therapy', 'rehab'] },
  { id: 'ayurveda', label: 'Ayurveda (BAMS)', searchTerms: ['ayurvedic', 'bams', 'herbal'] },
  { id: 'homeopathy', label: 'Homeopathy (BHMS)', searchTerms: ['homeopathic', 'bhms'] },
  { id: 'unani', label: 'Unani Medicine', searchTerms: ['unani', 'bums'] },
  { id: 'yoga', label: 'Yoga & Naturopathy', searchTerms: ['yoga', 'naturopathy', 'bnys'] },
  { id: 'dietetics', label: 'Dietetics & Nutrition', searchTerms: ['dietician', 'nutritionist', 'diet'] },
  { id: 'other', label: 'Other Specialty', searchTerms: ['other', 'specialist'] },
];

/**
 * Get specialty label by ID
 */
export const getSpecialtyLabel = (id: string): string => {
  const specialty = MEDICAL_SPECIALTIES.find(s => s.id === id);
  return specialty?.label || id;
};

/**
 * Search specialties by term (for autocomplete)
 */
export const searchSpecialties = (searchTerm: string): MedicalSpecialty[] => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return MEDICAL_SPECIALTIES;

  return MEDICAL_SPECIALTIES.filter(specialty => 
    specialty.label.toLowerCase().includes(term) ||
    specialty.searchTerms.some(st => st.includes(term))
  );
};

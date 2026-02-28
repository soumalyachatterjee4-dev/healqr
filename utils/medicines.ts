export interface Medicine {
  name: string;
  type: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops' | 'Cream' | 'Gel';
  strength: string;
  commonDosage?: string;
}

export const COMMON_MEDICINES: Medicine[] = [
  // Pain & Fever
  { name: 'Paracetamol', type: 'Tablet', strength: '500mg', commonDosage: '1-0-1' },
  { name: 'Paracetamol', type: 'Tablet', strength: '650mg', commonDosage: '1-0-1' },
  { name: 'Dolo', type: 'Tablet', strength: '650mg', commonDosage: '1-0-1' },
  { name: 'Calpol', type: 'Tablet', strength: '500mg', commonDosage: '1-0-1' },
  { name: 'Combiflam', type: 'Tablet', strength: '400mg', commonDosage: '1-0-1' },
  { name: 'Aceclofenac', type: 'Tablet', strength: '100mg', commonDosage: '1-0-1' },
  { name: 'Zerodol-P', type: 'Tablet', strength: '100mg/325mg', commonDosage: '1-0-1' },
  { name: 'Mefenamic Acid', type: 'Tablet', strength: '500mg', commonDosage: '1-0-1' },
  { name: 'Meftal-Spas', type: 'Tablet', strength: '250mg/10mg', commonDosage: '1-0-1' },

  // Antibiotics
  { name: 'Augmentin', type: 'Tablet', strength: '625 Duo', commonDosage: '1-0-1' },
  { name: 'Amoxicillin', type: 'Capsule', strength: '500mg', commonDosage: '1-1-1' },
  { name: 'Azithromycin', type: 'Tablet', strength: '500mg', commonDosage: '1-0-0' },
  { name: 'Ciprofloxacin', type: 'Tablet', strength: '500mg', commonDosage: '1-0-1' },
  { name: 'Ofloxacin', type: 'Tablet', strength: '200mg', commonDosage: '1-0-1' },
  { name: 'Taxim-O', type: 'Tablet', strength: '200mg', commonDosage: '1-0-1' },
  { name: 'Moxikind-CV', type: 'Tablet', strength: '625mg', commonDosage: '1-0-1' },

  // Gastric & Acidity
  { name: 'Pantoprazole', type: 'Tablet', strength: '40mg', commonDosage: '1-0-0 (Empty Stomach)' },
  { name: 'Omeprazole', type: 'Capsule', strength: '20mg', commonDosage: '1-0-0 (Empty Stomach)' },
  { name: 'Pantocid', type: 'Tablet', strength: '40mg', commonDosage: '1-0-0' },
  { name: 'Pan-D', type: 'Capsule', strength: '40mg/30mg', commonDosage: '1-0-0' },
  { name: 'Rabeprazole', type: 'Tablet', strength: '20mg', commonDosage: '1-0-0' },
  { name: 'Rantac', type: 'Tablet', strength: '150mg', commonDosage: '1-0-1' },
  { name: 'Digene', type: 'Syrup', strength: '200ml', commonDosage: '2 tsp' },

  // Cough, Cold & Allergy
  { name: 'Cetirizine', type: 'Tablet', strength: '10mg', commonDosage: '0-0-1' },
  { name: 'Levocetirizine', type: 'Tablet', strength: '5mg', commonDosage: '0-0-1' },
  { name: 'Montelukast', type: 'Tablet', strength: '10mg', commonDosage: '0-0-1' },
  { name: 'Montair-LC', type: 'Tablet', strength: '10mg/5mg', commonDosage: '0-0-1' },
  { name: 'Allegra', type: 'Tablet', strength: '120mg', commonDosage: '1-0-0' },
  { name: 'Ascoril-LS', type: 'Syrup', strength: '100ml', commonDosage: '5ml TDS' },
  { name: 'Alex', type: 'Syrup', strength: '100ml', commonDosage: '5ml TDS' },

  // Diabetes & BP
  { name: 'Metformin', type: 'Tablet', strength: '500mg', commonDosage: '1-0-1' },
  { name: 'Glycomet', type: 'Tablet', strength: '500mg SR', commonDosage: '1-0-1' },
  { name: 'Amlodipine', type: 'Tablet', strength: '5mg', commonDosage: '1-0-0' },
  { name: 'Telmisartan', type: 'Tablet', strength: '40mg', commonDosage: '1-0-0' },
  { name: 'Telma', type: 'Tablet', strength: '40mg', commonDosage: '1-0-0' },

  // Vitamins & Supplements
  { name: 'Becosules', type: 'Capsule', strength: 'Z', commonDosage: '0-1-0' },
  { name: 'Neurobion Forte', type: 'Tablet', strength: 'Standard', commonDosage: '0-1-0' },
  { name: 'Shelcal', type: 'Tablet', strength: '500mg', commonDosage: '0-1-0' },
  { name: 'Limcee', type: 'Tablet', strength: '500mg', commonDosage: '1-0-0' },
  { name: 'Evion', type: 'Capsule', strength: '400mg', commonDosage: '0-1-0' },
];

export const searchMedicines = (query: string): Medicine[] => {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  return COMMON_MEDICINES.filter(m =>
    m.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 5); // Limit to top 5 for speed
};

export const MEDICAL_SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
  "Gynecologist",
  "Orthopedic Surgeon",
  "Dentist",
  "ENT Specialist",
  "Ophthalmologist (Eye)",
  "Psychiatrist",
  "Neurologist",
  "Urologist",
  "Gastroenterologist",
  "Endocrinologist",
  "Pulmonologist",
  "Oncologist",
  "Nephrologist",
  "Rheumatologist",
  "Dietitian/Nutritionist",
  "Physiotherapist",
  "Ayurveda",
  "Homeopathy",
  "General Surgeon",
  "Plastic Surgeon",
  "Veterinarian"
] as const;

export type MedicalSpecialty = typeof MEDICAL_SPECIALTIES[number];

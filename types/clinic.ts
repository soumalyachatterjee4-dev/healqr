export interface Clinic {
  clinicId: string;
  name: string;
  address: string;
  linkedDoctors: string[];
  clinicSchedules: { doctorId: string; schedules: import('./doctor').Schedule[] }[];
  // ...other fields as needed
}

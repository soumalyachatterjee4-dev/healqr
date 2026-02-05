export type ProfileType = 'solo' | 'clinic-only' | 'solo+clinic';

export interface Schedule {
  day: string; // e.g. 'Monday'
  startTime: string; // '16:00'
  endTime: string; // '18:00'
  location: string;
  clinicId?: string; // present if clinic schedule
}

export interface Doctor {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  specialty?: string;
  profileType: ProfileType;
  linkedClinics: string[];
  soloSchedule?: Schedule[];
  clinicSchedules?: { clinicId: string; schedules: Schedule[] }[];
  qrCode?: string;
  // ...other fields as needed
}

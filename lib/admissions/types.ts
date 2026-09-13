export type AdmissionStatus = 'Open' | 'Closing' | 'Upcoming';

export interface Admission {
  id: string;
  day: string;
  month: string;
  title: string;
  org: string;
  status: AdmissionStatus;
  sortDate: string; // ISO date, for ordering only
}

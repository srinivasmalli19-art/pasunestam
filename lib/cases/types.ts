export type CaseStatus = 'submitted' | 'published' | 'rejected';

export interface Case {
  id: string;
  title: string;
  species: string;
  body: string;
  submittedBy: string;
  submitterName: string;
  status: CaseStatus;
  createdAt: string;
}

export const CASE_SPECIES = ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Dog', 'Cat', 'Horse', 'Pig', 'Poultry'];

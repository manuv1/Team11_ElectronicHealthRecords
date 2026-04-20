export interface MockPatientSummary {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender: "female" | "male" | "other";
  dateOfBirth: string;
}

export const mockPatientSummaries: MockPatientSummary[] = [
  {
    id: "pat_001",
    mrn: "MRN-20260420-0001",
    firstName: "Ava",
    lastName: "Sharma",
    gender: "female",
    dateOfBirth: "1991-08-14",
  },
  {
    id: "pat_002",
    mrn: "MRN-20260420-0002",
    firstName: "Noah",
    lastName: "Patel",
    gender: "male",
    dateOfBirth: "1987-01-22",
  },
];

import type { Patient } from "../types/patient.ts";

export type MockPatientSummary = Patient;

export const mockPatientSummaries: MockPatientSummary[] = [
  {
    id: "pat_001",
    mrn: "MRN-20260420-0001",
    firstName: "Ava",
    lastName: "Sharma",
    gender: "FEMALE",
    dateOfBirth: "1991-08-14",
    email: "ava.sharma@example.test",
    phone: "+1-555-0101",
    address: "120 Clinic Way, Springfield",
    bloodType: "O+",
    allergies: ["Penicillin"],
    isActive: true,
    createdAt: "2026-04-20T08:00:00.000Z",
    updatedAt: "2026-04-20T08:00:00.000Z",
  },
  {
    id: "pat_002",
    mrn: "MRN-20260420-0002",
    firstName: "Noah",
    lastName: "Patel",
    gender: "MALE",
    dateOfBirth: "1987-01-22",
    email: "noah.patel@example.test",
    phone: "+1-555-0102",
    address: "44 Care Street, Springfield",
    bloodType: "A-",
    allergies: ["Aspirin"],
    isActive: true,
    createdAt: "2026-04-20T08:05:00.000Z",
    updatedAt: "2026-04-20T08:05:00.000Z",
  },
];

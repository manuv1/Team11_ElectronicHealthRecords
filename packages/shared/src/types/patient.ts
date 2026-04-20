export type PatientGender = "MALE" | "FEMALE" | "OTHER";

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: PatientGender;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: BloodType;
  allergies: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: PatientGender;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: BloodType;
  allergies?: string[];
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: PatientGender;
  email?: string;
  phone?: string;
  address?: string;
  bloodType?: BloodType;
  allergies?: string[];
}

export interface PatientListQuery {
  search?: string;
  page: number;
  limit: number;
}


import type { PaginationMeta } from "../../../../packages/shared/src/types/api-response";
import type {
  BloodType,
  CreatePatientRequest,
  Patient,
  PatientGender,
  UpdatePatientRequest,
} from "../../../../packages/shared/src/types/patient";

export const patientGenders: PatientGender[] = ["MALE", "FEMALE", "OTHER"];
export const bloodTypes: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export type {
  BloodType,
  CreatePatientRequest,
  Patient,
  PatientGender,
  UpdatePatientRequest,
};

export interface PatientFilters {
  search: string;
  page: number;
  limit: number;
}

export interface PatientListResult {
  patients: Patient[];
  pagination?: PaginationMeta;
}


import { PaginationMeta } from "../../../../packages/shared/src/types/api-response";
import {
  CreateMedicationRequest,
  Medication,
  MedicationStatus,
  UpdateMedicationRequest,
} from "../../../../packages/shared/src/types/medication";

export const medicationStatuses = ["ACTIVE", "DISCONTINUED"] as const;

export type {
  CreateMedicationRequest,
  Medication,
  MedicationStatus,
  UpdateMedicationRequest,
};

export interface MedicationFilters {
  patientId: string;
  status: MedicationStatus | "ALL";
}

export type MedicationFormPayload = CreateMedicationRequest;

export interface MedicationListResult {
  medications: Medication[];
  pagination?: PaginationMeta;
}

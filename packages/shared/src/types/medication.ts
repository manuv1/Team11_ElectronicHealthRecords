export type MedicationStatus = "ACTIVE" | "DISCONTINUED";

export interface Medication {
  id: string;
  patientId: string;
  patientName?: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedBy: string;
  prescribedByName?: string;
  startDate: string;
  endDate?: string;
  status: MedicationStatus;
  notes?: string;
  allergyWarnings: string[];
  discontinueReason?: string;
  discontinuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationListQuery {
  status?: MedicationStatus | "ALL";
  page: number;
  limit: number;
}

export interface CreateMedicationRequest {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  status?: MedicationStatus;
  notes?: string;
  discontinueReason?: string;
}

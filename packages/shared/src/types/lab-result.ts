export type LabResultStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface LabResult {
  id: string;
  patientId: string;
  patientName?: string;
  testName: string;
  testCode: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  status: LabResultStatus;
  orderedBy: string;
  orderedByName?: string;
  orderedAt: string;
  resultedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabResultListQuery {
  status?: LabResultStatus | "ALL";
  abnormal?: boolean;
  page: number;
  limit: number;
}

export interface CreateLabOrderRequest {
  testName: string;
  testCode: string;
  orderedAt?: string;
  notes?: string;
}

export interface UpdateLabResultRequest {
  testName?: string;
  testCode?: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  status?: LabResultStatus;
  resultedAt?: string;
  notes?: string;
}

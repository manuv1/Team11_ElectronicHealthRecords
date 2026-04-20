import { PaginationMeta } from "../../../../packages/shared/src/types/api-response";
import {
  CreateLabOrderRequest,
  LabResult,
  LabResultStatus,
  UpdateLabResultRequest,
} from "../../../../packages/shared/src/types/lab-result";

export const labResultStatuses: LabResultStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export type {
  CreateLabOrderRequest,
  LabResult,
  LabResultStatus,
  UpdateLabResultRequest,
};

export interface LabResultFilters {
  patientId: string;
  status: LabResultStatus | "ALL";
  abnormal: "ALL" | "true" | "false";
}

export type LabOrderFormPayload = CreateLabOrderRequest;
export type LabResultEntryPayload = UpdateLabResultRequest;

export interface LabResultListResult {
  labResults: LabResult[];
  pagination?: PaginationMeta;
}

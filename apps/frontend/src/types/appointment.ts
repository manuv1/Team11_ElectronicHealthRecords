import { PaginationMeta } from "../../../../packages/shared/src/types/api-response";

export const appointmentTypes = [
  "CHECKUP",
  "FOLLOW_UP",
  "CONSULTATION",
  "PROCEDURE",
  "EMERGENCY",
] as const;

export const appointmentStatuses = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export type AppointmentType = (typeof appointmentTypes)[number];
export type AppointmentStatus = (typeof appointmentStatuses)[number];

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  dateTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  patientName?: string;
  providerName?: string;
  createdAt?: string;
  cancelledAt?: string;
}

export interface AppointmentFilters {
  patientId: string;
  providerId: string;
  status: AppointmentStatus | "ALL";
  startDate: string;
  endDate: string;
}

export interface AppointmentBookingPayload {
  patientId: string;
  providerId: string;
  dateTime: string;
  duration?: number;
  type: AppointmentType;
  notes?: string;
}

export interface AppointmentStatusUpdatePayload {
  status: AppointmentStatus;
}

export interface AppointmentListResult {
  appointments: Appointment[];
  pagination?: PaginationMeta;
}

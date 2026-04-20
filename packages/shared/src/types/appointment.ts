export type AppointmentType =
  | "CHECKUP"
  | "FOLLOW_UP"
  | "CONSULTATION"
  | "PROCEDURE"
  | "EMERGENCY";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  dateTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  providerId: string;
  dateTime: string;
  duration?: number;
  type: AppointmentType;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  patientId?: string;
  providerId?: string;
  dateTime?: string;
  duration?: number;
  type?: AppointmentType;
  status?: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
}

export interface AppointmentListQuery {
  patientId?: string;
  providerId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}


import crypto from "crypto";

import { mockProviders } from "../../../../packages/shared/src/mocks/appointments";
import { UserRole } from "../types/auth";
import {
  Appointment,
  AppointmentListFilters,
  AppointmentStatus,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "../types/appointment";
import { recordAuditEntry } from "./audit-service";
import { patientService } from "./patient-service";

export class AppointmentServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

interface RequestActor {
  userId?: string;
  role?: UserRole;
}

const allowedStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const restrictedStatusRoles: Partial<Record<AppointmentStatus, UserRole[]>> = {
  NO_SHOW: ["DOCTOR", "ADMIN"],
  COMPLETED: ["DOCTOR", "ADMIN"],
};

const nowIso = (): string => new Date().toISOString();

const initialAppointments: Appointment[] = [
  {
    id: "apt_backend_001",
    patientId: "pat_001",
    patientName: "Ava Sharma",
    providerId: "prov_001",
    providerName: "Dr. Meera Rao",
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    type: "CHECKUP",
    status: "SCHEDULED",
    notes: "Annual wellness appointment.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const appointments: Appointment[] = [...initialAppointments];

const getAppointmentEnd = (appointment: Pick<Appointment, "dateTime" | "duration">): number =>
  new Date(appointment.dateTime).getTime() + appointment.duration * 60 * 1000;

const getDateRangeEnd = (dateString: string): number => {
  const parsed = new Date(dateString);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed.getTime();
};

const findPatient = async (patientId: string) => {
  try {
    return await patientService.getById(patientId);
  } catch {
    return undefined;
  }
};

const findProvider = (providerId: string) =>
  mockProviders.find((provider) => provider.id === providerId);

const findOverlap = (
  providerId: string,
  dateTime: string,
  duration: number,
  excludeAppointmentId?: string,
): Appointment | undefined => {
  const requestedStart = new Date(dateTime).getTime();
  const requestedEnd = requestedStart + duration * 60 * 1000;

  return appointments.find((appointment) => {
    if (
      appointment.id === excludeAppointmentId ||
      appointment.providerId !== providerId ||
      appointment.status === "CANCELLED"
    ) {
      return false;
    }

    const existingStart = new Date(appointment.dateTime).getTime();
    const existingEnd = getAppointmentEnd(appointment);

    return requestedStart < existingEnd && requestedEnd > existingStart;
  });
};

const assertScheduleIsAvailable = (
  providerId: string,
  dateTime: string,
  duration: number,
  excludeAppointmentId?: string,
): void => {
  if (new Date(dateTime).getTime() <= Date.now()) {
    throw new AppointmentServiceError(400, "VALIDATION_ERROR", "Appointment data is invalid", [
      "Cannot book appointments in the past",
    ]);
  }

  const conflictingAppointment = findOverlap(providerId, dateTime, duration, excludeAppointmentId);

  if (conflictingAppointment) {
    throw new AppointmentServiceError(409, "CONFLICT", "Provider already has an appointment at this time", [
      `Conflicts with appointment ${conflictingAppointment.id}`,
    ]);
  }
};

const assertStatusTransition = (
  currentStatus: AppointmentStatus,
  nextStatus: AppointmentStatus,
  actor: RequestActor,
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!allowedStatusTransitions[currentStatus].includes(nextStatus)) {
    throw new AppointmentServiceError(
      400,
      "VALIDATION_ERROR",
      `Cannot transition appointment from ${currentStatus} to ${nextStatus}`,
    );
  }

  const requiredRoles = restrictedStatusRoles[nextStatus];

  if (requiredRoles && (!actor.role || !requiredRoles.includes(actor.role))) {
    throw new AppointmentServiceError(403, "FORBIDDEN", "You do not have permission to set this appointment status");
  }
};

const recordAppointmentAudit = async (
  action: string,
  appointment: Appointment,
  actor: RequestActor,
): Promise<void> => {
  await recordAuditEntry({
    userId: actor.userId,
    action,
    resource: "appointment",
    outcome: "success",
    metadata: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      status: appointment.status,
    },
  });
};

export const appointmentService = {
  async listAll(): Promise<Appointment[]> {
    return [...appointments].sort(
      (left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime(),
    );
  },

  async list(filters: AppointmentListFilters): Promise<{ items: Appointment[]; total: number }> {
    const startDate = filters.startDate ? new Date(filters.startDate).getTime() : undefined;
    const endDate = filters.endDate ? getDateRangeEnd(filters.endDate) : undefined;

    const filteredItems = appointments
      .filter((appointment) => !filters.patientId || appointment.patientId === filters.patientId)
      .filter((appointment) => !filters.providerId || appointment.providerId === filters.providerId)
      .filter((appointment) => !filters.status || appointment.status === filters.status)
      .filter((appointment) => startDate === undefined || new Date(appointment.dateTime).getTime() >= startDate)
      .filter((appointment) => endDate === undefined || new Date(appointment.dateTime).getTime() <= endDate)
      .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());

    const startIndex = (filters.page - 1) * filters.limit;

    return {
      items: filteredItems.slice(startIndex, startIndex + filters.limit),
      total: filteredItems.length,
    };
  },

  async getById(appointmentId: string): Promise<Appointment> {
    const appointment = appointments.find((entry) => entry.id === appointmentId);

    if (!appointment) {
      throw new AppointmentServiceError(404, "NOT_FOUND", "Appointment not found");
    }

    return appointment;
  },

  async create(input: CreateAppointmentRequest, actor: RequestActor = {}): Promise<Appointment> {
    const duration = input.duration ?? 30;
    const patient = await findPatient(input.patientId);
    const provider = findProvider(input.providerId);
    const errors: string[] = [];

    if (!patient) errors.push("patientId must reference an existing active patient");
    if (!provider) errors.push("providerId must reference a valid provider");

    if (errors.length > 0 || !patient || !provider) {
      throw new AppointmentServiceError(400, "VALIDATION_ERROR", "Appointment data is invalid", errors);
    }

    assertScheduleIsAvailable(provider.id, input.dateTime, duration);

    const timestamp = nowIso();
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      providerId: provider.id,
      providerName: provider.name,
      dateTime: input.dateTime,
      duration,
      type: input.type,
      status: "SCHEDULED",
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    appointments.push(appointment);
    await recordAppointmentAudit("appointment.create", appointment, actor);

    return appointment;
  },

  async update(
    appointmentId: string,
    input: UpdateAppointmentRequest,
    actor: RequestActor = {},
  ): Promise<Appointment> {
    const appointment = await this.getById(appointmentId);

    if (appointment.status === "COMPLETED") {
      throw new AppointmentServiceError(409, "CONFLICT", "Completed appointments cannot be modified");
    }

    const nextStatus = input.status ?? appointment.status;
    assertStatusTransition(appointment.status, nextStatus, actor);

    const nextPatient = input.patientId
      ? await findPatient(input.patientId)
      : await findPatient(appointment.patientId);
    const nextProvider = input.providerId ? findProvider(input.providerId) : findProvider(appointment.providerId);
    const nextDateTime = input.dateTime ?? appointment.dateTime;
    const nextDuration = input.duration ?? appointment.duration;
    const errors: string[] = [];

    if (!nextPatient) errors.push("patientId must reference an existing active patient");
    if (!nextProvider) errors.push("providerId must reference a valid provider");

    if (errors.length > 0 || !nextPatient || !nextProvider) {
      throw new AppointmentServiceError(400, "VALIDATION_ERROR", "Appointment data is invalid", errors);
    }

    if (input.patientId || input.providerId || input.dateTime || input.duration) {
      assertScheduleIsAvailable(nextProvider.id, nextDateTime, nextDuration, appointment.id);
    }

    appointment.patientId = nextPatient.id;
    appointment.patientName = `${nextPatient.firstName} ${nextPatient.lastName}`;
    appointment.providerId = nextProvider.id;
    appointment.providerName = nextProvider.name;
    appointment.dateTime = nextDateTime;
    appointment.duration = nextDuration;
    appointment.type = input.type ?? appointment.type;
    appointment.status = nextStatus;
    appointment.notes = input.notes ?? appointment.notes;
    appointment.updatedAt = nowIso();

    if (nextStatus === "CANCELLED") {
      appointment.cancelledAt = nowIso();
      appointment.cancellationReason = input.cancellationReason;
    }

    await recordAppointmentAudit("appointment.update", appointment, actor);

    return appointment;
  },

  async cancel(
    appointmentId: string,
    actor: RequestActor = {},
    cancellationReason?: string,
  ): Promise<Appointment> {
    const appointment = await this.getById(appointmentId);

    if (!["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(appointment.status)) {
      throw new AppointmentServiceError(409, "CONFLICT", "Appointment cannot be cancelled from its current status");
    }

    appointment.status = "CANCELLED";
    appointment.cancelledAt = nowIso();
    appointment.cancellationReason = cancellationReason;
    appointment.updatedAt = nowIso();

    await recordAppointmentAudit("appointment.cancel", appointment, actor);

    return appointment;
  },
};

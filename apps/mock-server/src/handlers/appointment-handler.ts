import crypto from "crypto";
import type { Request, Response } from "express";

import { mockPatients } from "../data/patients";
import { appointments, providers } from "../data/appointments";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import type {
  Appointment,
  AppointmentListQuery,
  AppointmentStatus,
  AppointmentType,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "../../../../packages/shared/src/types/appointment.ts";

const appointmentTypes: AppointmentType[] = [
  "CHECKUP",
  "FOLLOW_UP",
  "CONSULTATION",
  "PROCEDURE",
  "EMERGENCY",
];

const appointmentStatuses: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const allowedStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const getAppointmentEnd = (appointment: Pick<Appointment, "dateTime" | "duration">): number =>
  new Date(appointment.dateTime).getTime() + appointment.duration * 60 * 1000;

const findConflict = (
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

const validateSchedule = (
  providerId: string,
  dateTime: string,
  duration: number,
  excludeAppointmentId?: string,
): string[] => {
  const errors: string[] = [];
  const parsedDateTime = new Date(dateTime);

  if (Number.isNaN(parsedDateTime.getTime())) {
    errors.push("dateTime must be a valid ISO date");
  } else if (parsedDateTime.getTime() <= Date.now()) {
    errors.push("Cannot book appointments in the past");
  }

  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    errors.push("duration must be between 15 and 240 minutes");
  }

  if (errors.length === 0 && findConflict(providerId, dateTime, duration, excludeAppointmentId)) {
    errors.push("Provider already has an appointment at this time");
  }

  return errors;
};

const normalizeListQuery = (query: Request["query"]): AppointmentListQuery => ({
  patientId: typeof query.patientId === "string" ? query.patientId : undefined,
  providerId: typeof query.providerId === "string" ? query.providerId : undefined,
  status:
    typeof query.status === "string" && appointmentStatuses.includes(query.status as AppointmentStatus)
      ? (query.status as AppointmentStatus)
      : undefined,
  startDate: typeof query.startDate === "string" ? query.startDate : undefined,
  endDate: typeof query.endDate === "string" ? query.endDate : undefined,
});

export const listMockAppointments = async (request: Request, response: Response): Promise<void> => {
  const query = normalizeListQuery(request.query);
  const startDate = query.startDate ? new Date(query.startDate).getTime() : undefined;
  const endDate = query.endDate ? new Date(query.endDate).getTime() : undefined;

  const filteredAppointments = appointments
    .filter((appointment) => !query.patientId || appointment.patientId === query.patientId)
    .filter((appointment) => !query.providerId || appointment.providerId === query.providerId)
    .filter((appointment) => !query.status || appointment.status === query.status)
    .filter((appointment) => startDate === undefined || new Date(appointment.dateTime).getTime() >= startDate)
    .filter((appointment) => endDate === undefined || new Date(appointment.dateTime).getTime() <= endDate)
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());

  response.status(200).json(
    buildMockSuccessResponse(filteredAppointments, "Mock appointments fetched", {
      page: 1,
      limit: filteredAppointments.length,
      total: filteredAppointments.length,
    }),
  );
};

export const getMockAppointment = async (request: Request, response: Response): Promise<void> => {
  const appointment = appointments.find((entry) => entry.id === request.params.id);

  if (!appointment) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Appointment not found"));
    return;
  }

  response.status(200).json(buildMockSuccessResponse(appointment, "Mock appointment fetched"));
};

export const createMockAppointment = async (request: Request, response: Response): Promise<void> => {
  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Appointment data is invalid", ["Request body must be an object"]));
    return;
  }

  const input = request.body as Partial<CreateAppointmentRequest>;
  const duration = Number(input.duration ?? 30);
  const patient = mockPatients.find((entry) => entry.id === input.patientId);
  const provider = providers.find((entry) => entry.id === input.providerId);
  const errors: string[] = [];

  if (!patient) errors.push("patientId must reference an existing patient");
  if (!provider) errors.push("providerId must reference an existing provider");
  if (!input.dateTime) errors.push("dateTime is required");
  if (!input.type || !appointmentTypes.includes(input.type)) {
    errors.push(`type must be one of ${appointmentTypes.join(", ")}`);
  }
  if (typeof input.notes === "string" && input.notes.length > 2000) {
    errors.push("notes must be 2000 characters or fewer");
  }

  if (input.dateTime && provider) {
    errors.push(...validateSchedule(provider.id, input.dateTime, duration));
  }

  if (errors.length > 0 || !patient || !provider || !input.dateTime || !input.type) {
    const hasConflict = errors.includes("Provider already has an appointment at this time");
    response
      .status(hasConflict ? 409 : 400)
      .json(buildMockErrorResponse(hasConflict ? "CONFLICT" : "VALIDATION_ERROR", "Appointment data is invalid", errors));
    return;
  }

  const now = new Date().toISOString();
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
    notes: readOptionalString(input.notes),
    createdAt: now,
    updatedAt: now,
  };

  appointments.push(appointment);
  response.status(201).json(buildMockSuccessResponse(appointment, "Appointment created"));
};

export const updateMockAppointment = async (request: Request, response: Response): Promise<void> => {
  const appointment = appointments.find((entry) => entry.id === request.params.id);

  if (!appointment) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Appointment not found"));
    return;
  }

  if (appointment.status === "COMPLETED") {
    response.status(409).json(buildMockErrorResponse("CONFLICT", "Completed appointments cannot be modified"));
    return;
  }

  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Appointment data is invalid", ["Request body must be an object"]));
    return;
  }

  const input = request.body as Partial<UpdateAppointmentRequest>;
  const nextProviderId = input.providerId ?? appointment.providerId;
  const nextDateTime = input.dateTime ?? appointment.dateTime;
  const nextDuration = Number(input.duration ?? appointment.duration);
  const provider = providers.find((entry) => entry.id === nextProviderId);
  const patient = input.patientId
    ? mockPatients.find((entry) => entry.id === input.patientId)
    : mockPatients.find((entry) => entry.id === appointment.patientId);
  const errors: string[] = [];

  if (input.patientId && !patient) errors.push("patientId must reference an existing patient");
  if (!provider) errors.push("providerId must reference an existing provider");
  if (input.type && !appointmentTypes.includes(input.type)) {
    errors.push(`type must be one of ${appointmentTypes.join(", ")}`);
  }
  if (input.status && !appointmentStatuses.includes(input.status)) {
    errors.push(`status must be one of ${appointmentStatuses.join(", ")}`);
  }
  if (input.status && input.status !== appointment.status) {
    const allowedTransitions = allowedStatusTransitions[appointment.status];
    if (!allowedTransitions.includes(input.status)) {
      errors.push(`Cannot transition appointment from ${appointment.status} to ${input.status}`);
    }
  }
  if (typeof input.notes === "string" && input.notes.length > 2000) {
    errors.push("notes must be 2000 characters or fewer");
  }

  const changesSchedule = Boolean(input.providerId || input.dateTime || input.duration);
  if (changesSchedule && provider) {
    errors.push(...validateSchedule(provider.id, nextDateTime, nextDuration, appointment.id));
  }

  if (errors.length > 0 || !provider || !patient) {
    const hasConflict = errors.includes("Provider already has an appointment at this time");
    response
      .status(hasConflict ? 409 : 400)
      .json(buildMockErrorResponse(hasConflict ? "CONFLICT" : "VALIDATION_ERROR", "Appointment data is invalid", errors));
    return;
  }

  appointment.patientId = patient.id;
  appointment.patientName = `${patient.firstName} ${patient.lastName}`;
  appointment.providerId = provider.id;
  appointment.providerName = provider.name;
  appointment.dateTime = nextDateTime;
  appointment.duration = nextDuration;
  appointment.type = input.type ?? appointment.type;
  appointment.notes = typeof input.notes === "string" ? input.notes.trim() : appointment.notes;
  appointment.updatedAt = new Date().toISOString();

  if (input.status) {
    appointment.status = input.status;
    if (input.status === "CANCELLED") {
      appointment.cancelledAt = new Date().toISOString();
      appointment.cancellationReason = readOptionalString(input.cancellationReason);
    }
  }

  response.status(200).json(buildMockSuccessResponse(appointment, "Appointment updated"));
};

export const cancelMockAppointment = async (request: Request, response: Response): Promise<void> => {
  const appointment = appointments.find((entry) => entry.id === request.params.id);

  if (!appointment) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Appointment not found"));
    return;
  }

  if (!["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(appointment.status)) {
    response.status(409).json(buildMockErrorResponse("CONFLICT", "Appointment cannot be cancelled from its current status"));
    return;
  }

  const reason = isRecord(request.body) ? readOptionalString(request.body.cancellationReason) : undefined;

  appointment.status = "CANCELLED";
  appointment.cancelledAt = new Date().toISOString();
  appointment.cancellationReason = reason;
  appointment.updatedAt = new Date().toISOString();

  response.status(200).json(buildMockSuccessResponse(appointment, "Appointment cancelled"));
};


import crypto from "crypto";
import type { Request, Response } from "express";

import { mockUsers } from "../data/auth-users";
import { medications } from "../data/medications";
import { mockPatients } from "../data/patients";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import type { UserRole } from "../../../../packages/shared/src/types/auth.ts";
import type {
  CreateMedicationRequest,
  Medication,
  MedicationStatus,
  UpdateMedicationRequest,
} from "../../../../packages/shared/src/types/medication.ts";

const allowedMedicationStatuses: MedicationStatus[] = ["ACTIVE", "DISCONTINUED"];
const prescribingRoles: UserRole[] = ["ADMIN", "DOCTOR"];
const viewingRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const getRequestRole = (request: Request): UserRole | undefined => {
  const rawRole = request.header("X-User-Role")?.trim().toUpperCase();

  return rawRole && ["ADMIN", "DOCTOR", "NURSE", "STAFF"].includes(rawRole)
    ? (rawRole as UserRole)
    : undefined;
};

const getRequestUser = (request: Request) => {
  const userId = request.header("X-User-Id")?.trim();

  return userId ? mockUsers.find((user) => user.id === userId) : undefined;
};

const requireRole = (
  request: Request,
  response: Response,
  allowedRoles: UserRole[],
): UserRole | undefined => {
  const role = getRequestRole(request);

  if (!role || !allowedRoles.includes(role)) {
    response
      .status(403)
      .json(buildMockErrorResponse("FORBIDDEN", "You do not have permission to access medications"));
    return undefined;
  }

  return role;
};

const isValidDate = (value: string | undefined): boolean =>
  Boolean(value && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()));

const getPatientName = (patient: { firstName: string; lastName: string }): string =>
  `${patient.firstName} ${patient.lastName}`.trim();

const getAllergyWarnings = (
  patient: { allergies: string[] },
  medicationName: string,
): string[] => {
  const normalizedMedicationName = medicationName.toLowerCase();

  return patient.allergies
    .filter((allergy) => {
      const normalizedAllergy = allergy.toLowerCase();

      return (
        normalizedMedicationName.includes(normalizedAllergy) ||
        normalizedAllergy.includes(normalizedMedicationName)
      );
    })
    .map((allergy) => `Patient has recorded allergy: ${allergy}`);
};

const validateMedicationInput = (
  input: Partial<CreateMedicationRequest & UpdateMedicationRequest>,
  mode: "create" | "update",
): string[] => {
  const errors: string[] = [];
  const hasRequiredCreateFields =
    Boolean(input.name?.trim()) &&
    Boolean(input.dosage?.trim()) &&
    Boolean(input.frequency?.trim()) &&
    Boolean(input.route?.trim()) &&
    Boolean(input.startDate?.trim());

  if (mode === "create" && !hasRequiredCreateFields) {
    errors.push("name, dosage, frequency, route, and startDate are required");
  }

  if (input.name !== undefined && !input.name.trim()) errors.push("name cannot be blank");
  if (input.dosage !== undefined && !input.dosage.trim()) errors.push("dosage cannot be blank");
  if (input.frequency !== undefined && !input.frequency.trim()) errors.push("frequency cannot be blank");
  if (input.route !== undefined && !input.route.trim()) errors.push("route cannot be blank");
  if (input.startDate !== undefined && !isValidDate(input.startDate)) errors.push("startDate must be a valid date");
  if (input.endDate !== undefined && !isValidDate(input.endDate)) errors.push("endDate must be a valid date");
  if (input.status !== undefined && !allowedMedicationStatuses.includes(input.status)) {
    errors.push(`status must be one of ${allowedMedicationStatuses.join(", ")}`);
  }
  if (input.notes !== undefined && input.notes.length > 2000) {
    errors.push("notes must be 2000 characters or fewer");
  }
  if (input.discontinueReason !== undefined && input.discontinueReason.length > 500) {
    errors.push("discontinueReason must be 500 characters or fewer");
  }

  const startDate = input.startDate;
  const endDate = input.endDate;

  if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
    errors.push("endDate must be on or after startDate");
  }

  return errors;
};

export const listMockPatientMedications = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, viewingRoles)) {
    return;
  }

  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const rawStatus = typeof request.query.status === "string" ? request.query.status.toUpperCase() : "ACTIVE";
  const status = rawStatus === "ALL" ? "ALL" : allowedMedicationStatuses.includes(rawStatus as MedicationStatus)
    ? (rawStatus as MedicationStatus)
    : "ACTIVE";
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 50);
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 50;

  const filteredMedications = medications
    .filter((medication) => medication.patientId === patient.id)
    .filter((medication) => status === "ALL" || medication.status === status)
    .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());
  const startIndex = (normalizedPage - 1) * normalizedLimit;
  const items = filteredMedications.slice(startIndex, startIndex + normalizedLimit);

  response.status(200).json(
    buildMockSuccessResponse(items, "Mock medications fetched", {
      page: normalizedPage,
      limit: normalizedLimit,
      total: filteredMedications.length,
      totalPages: Math.ceil(filteredMedications.length / normalizedLimit),
    }),
  );
};

export const createMockPatientMedication = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, prescribingRoles)) {
    return;
  }

  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Medication data is invalid", ["Request body must be an object"]));
    return;
  }

  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const input = request.body as Partial<CreateMedicationRequest>;
  const errors = validateMedicationInput(input, "create");

  if (errors.length > 0 || !input.name || !input.dosage || !input.frequency || !input.route || !input.startDate) {
    response.status(400).json(buildMockErrorResponse("VALIDATION_ERROR", "Medication data is invalid", errors));
    return;
  }

  const now = new Date().toISOString();
  const actor = getRequestUser(request);
  const medication: Medication = {
    id: crypto.randomUUID(),
    patientId: patient.id,
    patientName: getPatientName(patient),
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    frequency: input.frequency.trim(),
    route: input.route.trim(),
    prescribedBy: actor?.id ?? "mock-user",
    prescribedByName: actor ? `${actor.firstName} ${actor.lastName}` : undefined,
    startDate: input.startDate,
    endDate: readOptionalString(input.endDate),
    status: input.endDate ? "DISCONTINUED" : "ACTIVE",
    notes: readOptionalString(input.notes),
    allergyWarnings: getAllergyWarnings(patient, input.name),
    createdAt: now,
    updatedAt: now,
  };

  medications.push(medication);
  response.status(201).json(buildMockSuccessResponse(medication, "Medication prescribed"));
};

export const updateMockMedication = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, prescribingRoles)) {
    return;
  }

  const medication = medications.find((entry) => entry.id === request.params.id);

  if (!medication) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Medication not found"));
    return;
  }

  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Medication data is invalid", ["Request body must be an object"]));
    return;
  }

  const input = request.body as Partial<UpdateMedicationRequest>;
  const errors = validateMedicationInput(input, "update");
  const patient = mockPatients.find((entry) => entry.id === medication.patientId && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  if (medication.status === "DISCONTINUED" && input.status === "ACTIVE") {
    errors.push("Discontinued medications cannot be reactivated");
  }

  if (errors.length > 0) {
    const hasConflict = errors.includes("Discontinued medications cannot be reactivated");
    response
      .status(hasConflict ? 409 : 400)
      .json(buildMockErrorResponse(hasConflict ? "CONFLICT" : "VALIDATION_ERROR", "Medication data is invalid", errors));
    return;
  }

  medication.name = input.name?.trim() ?? medication.name;
  medication.dosage = input.dosage?.trim() ?? medication.dosage;
  medication.frequency = input.frequency?.trim() ?? medication.frequency;
  medication.route = input.route?.trim() ?? medication.route;
  medication.startDate = input.startDate ?? medication.startDate;
  medication.endDate = input.endDate ?? medication.endDate;
  medication.notes = input.notes?.trim() ?? medication.notes;
  medication.allergyWarnings = getAllergyWarnings(patient, medication.name);

  if (input.status === "DISCONTINUED") {
    medication.status = "DISCONTINUED";
    medication.endDate = input.endDate ?? medication.endDate ?? new Date().toISOString().slice(0, 10);
    medication.discontinuedAt = medication.discontinuedAt ?? new Date().toISOString();
    medication.discontinueReason = readOptionalString(input.discontinueReason) ?? medication.discontinueReason;
  }

  medication.updatedAt = new Date().toISOString();

  response.status(200).json(buildMockSuccessResponse(medication, "Medication updated"));
};

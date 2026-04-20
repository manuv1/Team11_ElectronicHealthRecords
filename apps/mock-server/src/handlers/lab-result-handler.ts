import crypto from "crypto";
import type { Request, Response } from "express";

import { mockUsers } from "../data/auth-users";
import { labResults } from "../data/lab-results";
import { mockPatients } from "../data/patients";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import type { UserRole } from "../../../../packages/shared/src/types/auth.ts";
import type {
  CreateLabOrderRequest,
  LabResult,
  LabResultStatus,
  UpdateLabResultRequest,
} from "../../../../packages/shared/src/types/lab-result.ts";

const allowedLabStatuses: LabResultStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
const orderingRoles: UserRole[] = ["ADMIN", "DOCTOR"];
const resultEntryRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE"];

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
      .json(buildMockErrorResponse("FORBIDDEN", "You do not have permission to access lab results"));
    return undefined;
  }

  return role;
};

const getPatientName = (patient: { firstName: string; lastName: string }): string =>
  `${patient.firstName} ${patient.lastName}`.trim();

const isValidDateTime = (value: string | undefined): boolean =>
  Boolean(value && !Number.isNaN(new Date(value).getTime()));

const validateLabInput = (
  input: Partial<CreateLabOrderRequest & UpdateLabResultRequest>,
  mode: "create" | "update",
): string[] => {
  const errors: string[] = [];
  const hasRequiredCreateFields = Boolean(input.testName?.trim()) && Boolean(input.testCode?.trim());

  if (mode === "create" && !hasRequiredCreateFields) {
    errors.push("testName and testCode are required");
  }

  if (input.testName !== undefined && !input.testName.trim()) errors.push("testName cannot be blank");
  if (input.testCode !== undefined && !/^[A-Za-z0-9.-]+$/.test(input.testCode.trim())) {
    errors.push("testCode must be a valid LOINC-style code");
  }
  if (input.orderedAt !== undefined && !isValidDateTime(input.orderedAt)) {
    errors.push("orderedAt must be a valid date/time");
  }
  if (input.resultedAt !== undefined && !isValidDateTime(input.resultedAt)) {
    errors.push("resultedAt must be a valid date/time");
  }
  if (input.status !== undefined && !allowedLabStatuses.includes(input.status)) {
    errors.push(`status must be one of ${allowedLabStatuses.join(", ")}`);
  }
  if (input.notes !== undefined && input.notes.length > 2000) {
    errors.push("notes must be 2000 characters or fewer");
  }
  if (input.result !== undefined && input.result.length > 120) {
    errors.push("result must be 120 characters or fewer");
  }
  if (input.unit !== undefined && input.unit.length > 40) {
    errors.push("unit must be 40 characters or fewer");
  }
  if (input.normalRange !== undefined && input.normalRange.length > 80) {
    errors.push("normalRange must be 80 characters or fewer");
  }

  return errors;
};

export const listMockPatientLabResults = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, resultEntryRoles)) {
    return;
  }

  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const rawStatus = typeof request.query.status === "string" ? request.query.status.toUpperCase() : "ALL";
  const status = rawStatus === "ALL" ? "ALL" : allowedLabStatuses.includes(rawStatus as LabResultStatus)
    ? (rawStatus as LabResultStatus)
    : "ALL";
  const abnormal =
    request.query.abnormal === "true" ? true : request.query.abnormal === "false" ? false : undefined;
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 50);
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 50;

  const filteredLabResults = labResults
    .filter((labResult) => labResult.patientId === patient.id)
    .filter((labResult) => status === "ALL" || labResult.status === status)
    .filter((labResult) => abnormal === undefined || Boolean(labResult.isAbnormal) === abnormal)
    .sort((left, right) => new Date(right.orderedAt).getTime() - new Date(left.orderedAt).getTime());
  const startIndex = (normalizedPage - 1) * normalizedLimit;
  const items = filteredLabResults.slice(startIndex, startIndex + normalizedLimit);

  response.status(200).json(
    buildMockSuccessResponse(items, "Mock lab results fetched", {
      page: normalizedPage,
      limit: normalizedLimit,
      total: filteredLabResults.length,
      totalPages: Math.ceil(filteredLabResults.length / normalizedLimit),
    }),
  );
};

export const createMockPatientLabOrder = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, orderingRoles)) {
    return;
  }

  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Lab order data is invalid", ["Request body must be an object"]));
    return;
  }

  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const input = request.body as Partial<CreateLabOrderRequest>;
  const errors = validateLabInput(input, "create");

  if (errors.length > 0 || !input.testName || !input.testCode) {
    response.status(400).json(buildMockErrorResponse("VALIDATION_ERROR", "Lab order data is invalid", errors));
    return;
  }

  const now = new Date().toISOString();
  const actor = getRequestUser(request);
  const labResult: LabResult = {
    id: crypto.randomUUID(),
    patientId: patient.id,
    patientName: getPatientName(patient),
    testName: input.testName.trim(),
    testCode: input.testCode.trim(),
    status: "PENDING",
    orderedBy: actor?.id ?? "mock-user",
    orderedByName: actor ? `${actor.firstName} ${actor.lastName}` : undefined,
    orderedAt: input.orderedAt ?? now,
    notes: readOptionalString(input.notes),
    createdAt: now,
    updatedAt: now,
  };

  labResults.push(labResult);
  response.status(201).json(buildMockSuccessResponse(labResult, "Lab test ordered"));
};

export const updateMockLabResult = async (
  request: Request,
  response: Response,
): Promise<void> => {
  if (!requireRole(request, response, resultEntryRoles)) {
    return;
  }

  const labResult = labResults.find((entry) => entry.id === request.params.id);

  if (!labResult) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Lab result not found"));
    return;
  }

  if (!isRecord(request.body)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Lab result data is invalid", ["Request body must be an object"]));
    return;
  }

  const input = request.body as Partial<UpdateLabResultRequest>;
  const errors = validateLabInput(input, "update");

  if (errors.length > 0) {
    response.status(400).json(buildMockErrorResponse("VALIDATION_ERROR", "Lab result data is invalid", errors));
    return;
  }

  labResult.testName = input.testName?.trim() ?? labResult.testName;
  labResult.testCode = input.testCode?.trim() ?? labResult.testCode;
  labResult.result = readOptionalString(input.result) ?? labResult.result;
  labResult.unit = readOptionalString(input.unit) ?? labResult.unit;
  labResult.normalRange = readOptionalString(input.normalRange) ?? labResult.normalRange;
  labResult.isAbnormal = input.isAbnormal ?? labResult.isAbnormal;
  labResult.notes = readOptionalString(input.notes) ?? labResult.notes;

  if (input.status) {
    labResult.status = input.status;
  } else if (input.result && labResult.status !== "COMPLETED") {
    labResult.status = "COMPLETED";
  }

  if (labResult.status === "COMPLETED") {
    labResult.resultedAt = input.resultedAt ?? labResult.resultedAt ?? new Date().toISOString();
  } else {
    labResult.resultedAt = input.resultedAt ?? labResult.resultedAt;
  }

  labResult.updatedAt = new Date().toISOString();

  response.status(200).json(buildMockSuccessResponse(labResult, "Lab result updated"));
};

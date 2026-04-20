import {
  CreateMedicationRequest,
  MedicationListQuery,
  MedicationStatus,
  UpdateMedicationRequest,
} from "../types/medication";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const allowedMedicationStatuses: MedicationStatus[] = ["ACTIVE", "DISCONTINUED"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readRequiredString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options: { maxLength?: number } = {},
): string => {
  if (typeof value !== "string") {
    errors.push(`${fieldName} is required`);
    return "";
  }

  const normalized = value.trim();

  if (!normalized) {
    errors.push(`${fieldName} is required`);
  }

  if (options.maxLength && normalized.length > options.maxLength) {
    errors.push(`${fieldName} must be ${options.maxLength} characters or fewer`);
  }

  return normalized;
};

const readOptionalString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options: { maxLength?: number } = {},
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} must be a string`);
    return undefined;
  }

  const normalized = value.trim();

  if (options.maxLength && normalized.length > options.maxLength) {
    errors.push(`${fieldName} must be ${options.maxLength} characters or fewer`);
  }

  return normalized;
};

const readDateString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  required: boolean,
): string | undefined => {
  const normalized = required
    ? readRequiredString(value, fieldName, errors)
    : readOptionalString(value, fieldName, errors);

  if (!normalized) {
    return undefined;
  }

  if (Number.isNaN(new Date(`${normalized}T00:00:00.000Z`).getTime())) {
    errors.push(`${fieldName} must be a valid date`);
  }

  return normalized;
};

const normalizeStatus = (
  value: unknown,
  fieldName: string,
  errors: string[],
): MedicationStatus | "ALL" | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = readOptionalString(value, fieldName, errors)?.toUpperCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "ALL") {
    return "ALL";
  }

  if (!allowedMedicationStatuses.includes(normalized as MedicationStatus)) {
    errors.push(`${fieldName} must be one of ${allowedMedicationStatuses.join(", ")}`);
    return undefined;
  }

  return normalized as MedicationStatus;
};

const readPositivePaginationInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  errors: string[],
  options: { max?: number } = {},
): number => {
  if (value === undefined) {
    return fallback;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === "string" ? Number(raw) : raw;

  if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < 1) {
    errors.push(`${fieldName} must be a positive integer`);
    return fallback;
  }

  if (options.max && parsed > options.max) {
    errors.push(`${fieldName} must be ${options.max} or less`);
    return fallback;
  }

  return parsed;
};

const assertDateOrder = (
  startDate: string | undefined,
  endDate: string | undefined,
  errors: string[],
): void => {
  if (!startDate || !endDate) {
    return;
  }

  if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
    errors.push("endDate must be on or after startDate");
  }
};

export const validateMedicationListQuery = (
  query: unknown,
): ValidationResult<MedicationListQuery> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(query)) {
    return {
      success: false,
      errors: ["Query parameters must be an object"],
    };
  }

  const status = normalizeStatus(query.status, "status", errors);
  const page = readPositivePaginationInteger(query.page, 1, "page", errors);
  const limit = readPositivePaginationInteger(query.limit, 50, "limit", errors, { max: 100 });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      status,
      page,
      limit,
    },
  };
};

export const validateCreateMedicationRequest = (
  payload: unknown,
): ValidationResult<CreateMedicationRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const name = readRequiredString(payload.name, "name", errors, { maxLength: 120 });
  const dosage = readRequiredString(payload.dosage, "dosage", errors, { maxLength: 80 });
  const frequency = readRequiredString(payload.frequency, "frequency", errors, { maxLength: 120 });
  const route = readRequiredString(payload.route, "route", errors, { maxLength: 80 });
  const startDate = readDateString(payload.startDate, "startDate", errors, true);
  const endDate = readDateString(payload.endDate, "endDate", errors, false);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });

  assertDateOrder(startDate, endDate, errors);

  if (errors.length > 0 || !startDate) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      name,
      dosage,
      frequency,
      route,
      startDate,
      endDate,
      notes,
    },
  };
};

export const validateUpdateMedicationRequest = (
  payload: unknown,
): ValidationResult<UpdateMedicationRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const name = readOptionalString(payload.name, "name", errors, { maxLength: 120 });
  const dosage = readOptionalString(payload.dosage, "dosage", errors, { maxLength: 80 });
  const frequency = readOptionalString(payload.frequency, "frequency", errors, { maxLength: 120 });
  const route = readOptionalString(payload.route, "route", errors, { maxLength: 80 });
  const startDate = readDateString(payload.startDate, "startDate", errors, false);
  const endDate = readDateString(payload.endDate, "endDate", errors, false);
  const status = normalizeStatus(payload.status, "status", errors);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });
  const discontinueReason = readOptionalString(payload.discontinueReason, "discontinueReason", errors, {
    maxLength: 500,
  });

  if (status === "ALL") {
    errors.push("status must be one of ACTIVE, DISCONTINUED");
  }

  assertDateOrder(startDate, endDate, errors);

  const hasUpdate = [
    name,
    dosage,
    frequency,
    route,
    startDate,
    endDate,
    status,
    notes,
    discontinueReason,
  ].some((value) => value !== undefined);

  if (!hasUpdate) {
    errors.push("At least one medication field must be provided");
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      name,
      dosage,
      frequency,
      route,
      startDate,
      endDate,
      status: status as MedicationStatus | undefined,
      notes,
      discontinueReason,
    },
  };
};

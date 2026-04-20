import {
  CreateLabOrderRequest,
  LabResultListQuery,
  LabResultStatus,
  UpdateLabResultRequest,
} from "../types/lab-result";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const allowedLabStatuses: LabResultStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readRequiredString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options: { maxLength?: number; pattern?: RegExp; patternMessage?: string } = {},
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

  if (normalized && options.pattern && !options.pattern.test(normalized)) {
    errors.push(options.patternMessage ?? `${fieldName} format is invalid`);
  }

  return normalized;
};

const readOptionalString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options: { maxLength?: number; pattern?: RegExp; patternMessage?: string } = {},
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

  if (normalized && options.pattern && !options.pattern.test(normalized)) {
    errors.push(options.patternMessage ?? `${fieldName} format is invalid`);
  }

  return normalized || undefined;
};

const readDateTimeString = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined => {
  const normalized = readOptionalString(value, fieldName, errors);

  if (!normalized) {
    return undefined;
  }

  if (Number.isNaN(new Date(normalized).getTime())) {
    errors.push(`${fieldName} must be a valid date/time`);
  }

  return normalized;
};

const readOptionalBoolean = (
  value: unknown,
  fieldName: string,
  errors: string[],
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  errors.push(`${fieldName} must be true or false`);
  return undefined;
};

const normalizeStatus = (
  value: unknown,
  fieldName: string,
  errors: string[],
): LabResultStatus | "ALL" | undefined => {
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

  if (!allowedLabStatuses.includes(normalized as LabResultStatus)) {
    errors.push(`${fieldName} must be one of ${allowedLabStatuses.join(", ")}`);
    return undefined;
  }

  return normalized as LabResultStatus;
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

export const validateLabResultListQuery = (
  query: unknown,
): ValidationResult<LabResultListQuery> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(query)) {
    return {
      success: false,
      errors: ["Query parameters must be an object"],
    };
  }

  const status = normalizeStatus(query.status, "status", errors);
  const abnormal = readOptionalBoolean(query.abnormal, "abnormal", errors);
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
      abnormal,
      page,
      limit,
    },
  };
};

export const validateCreateLabOrderRequest = (
  payload: unknown,
): ValidationResult<CreateLabOrderRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const testName = readRequiredString(payload.testName, "testName", errors, { maxLength: 160 });
  const testCode = readRequiredString(payload.testCode, "testCode", errors, {
    maxLength: 40,
    pattern: /^[A-Za-z0-9.-]+$/,
    patternMessage: "testCode must be a valid LOINC-style code",
  });
  const orderedAt = readDateTimeString(payload.orderedAt, "orderedAt", errors);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      testName,
      testCode,
      orderedAt,
      notes,
    },
  };
};

export const validateUpdateLabResultRequest = (
  payload: unknown,
): ValidationResult<UpdateLabResultRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const testName = readOptionalString(payload.testName, "testName", errors, { maxLength: 160 });
  const testCode = readOptionalString(payload.testCode, "testCode", errors, {
    maxLength: 40,
    pattern: /^[A-Za-z0-9.-]+$/,
    patternMessage: "testCode must be a valid LOINC-style code",
  });
  const result = readOptionalString(payload.result, "result", errors, { maxLength: 120 });
  const unit = readOptionalString(payload.unit, "unit", errors, { maxLength: 40 });
  const normalRange = readOptionalString(payload.normalRange, "normalRange", errors, { maxLength: 80 });
  const isAbnormal = readOptionalBoolean(payload.isAbnormal, "isAbnormal", errors);
  const status = normalizeStatus(payload.status, "status", errors);
  const resultedAt = readDateTimeString(payload.resultedAt, "resultedAt", errors);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });

  if (status === "ALL") {
    errors.push("status must be one of PENDING, IN_PROGRESS, COMPLETED");
  }

  const hasUpdate = [
    testName,
    testCode,
    result,
    unit,
    normalRange,
    isAbnormal,
    status,
    resultedAt,
    notes,
  ].some((value) => value !== undefined);

  if (!hasUpdate) {
    errors.push("At least one lab result field must be provided");
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
      testName,
      testCode,
      result,
      unit,
      normalRange,
      isAbnormal,
      status: status as LabResultStatus | undefined,
      resultedAt,
      notes,
    },
  };
};

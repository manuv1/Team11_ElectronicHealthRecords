import {
  AppointmentListFilters,
  AppointmentStatus,
  AppointmentType,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "../types/appointment";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const allowedAppointmentTypes: AppointmentType[] = [
  "CHECKUP",
  "FOLLOW_UP",
  "CONSULTATION",
  "PROCEDURE",
  "EMERGENCY",
];

const allowedAppointmentStatuses: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readRequiredString = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string => {
  if (typeof value !== "string") {
    errors.push(`${fieldName} is required`);
    return "";
  }

  const normalized = value.trim();

  if (!normalized) {
    errors.push(`${fieldName} is required`);
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

const readOptionalInteger = (
  value: unknown,
  fieldName: string,
  errors: string[],
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${fieldName} must be an integer`);
    return undefined;
  }

  return value;
};

const readRequiredDateTime = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string => {
  const normalized = readRequiredString(value, fieldName, errors);

  if (normalized && Number.isNaN(new Date(normalized).getTime())) {
    errors.push(`${fieldName} must be a valid date-time`);
  }

  return normalized;
};

const readOptionalDateTime = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined => {
  const normalized = readOptionalString(value, fieldName, errors);

  if (normalized && Number.isNaN(new Date(normalized).getTime())) {
    errors.push(`${fieldName} must be a valid date-time`);
  }

  return normalized;
};

const readOptionalDate = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${fieldName} must be a date string`);
    return undefined;
  }

  const normalized = value.trim();
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldName} must be a valid date`);
  }

  return normalized;
};

const normalizeType = (
  value: unknown,
  fieldName: string,
  errors: string[],
  required: boolean,
): AppointmentType | undefined => {
  if (value === undefined && !required) {
    return undefined;
  }

  const normalized = required
    ? readRequiredString(value, fieldName, errors).toUpperCase()
    : readOptionalString(value, fieldName, errors)?.toUpperCase();

  if (!normalized) {
    return undefined;
  }

  if (!allowedAppointmentTypes.includes(normalized as AppointmentType)) {
    errors.push(`${fieldName} must be one of ${allowedAppointmentTypes.join(", ")}`);
    return undefined;
  }

  return normalized as AppointmentType;
};

const normalizeStatus = (
  value: unknown,
  fieldName: string,
  errors: string[],
): AppointmentStatus | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = readOptionalString(value, fieldName, errors)?.toUpperCase();

  if (!normalized) {
    return undefined;
  }

  if (!allowedAppointmentStatuses.includes(normalized as AppointmentStatus)) {
    errors.push(`${fieldName} must be one of ${allowedAppointmentStatuses.join(", ")}`);
    return undefined;
  }

  return normalized as AppointmentStatus;
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

export const validateAppointmentListQuery = (
  query: unknown,
): ValidationResult<AppointmentListFilters> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(query)) {
    return {
      success: false,
      errors: ["Query parameters must be an object"],
    };
  }

  const patientId = readOptionalString(query.patientId, "patientId", errors);
  const providerId = readOptionalString(query.providerId, "providerId", errors);
  const status = normalizeStatus(query.status, "status", errors);
  const startDate = readOptionalDate(query.startDate, "startDate", errors);
  const endDate = readOptionalDate(query.endDate, "endDate", errors);
  const page = readPositivePaginationInteger(query.page, 1, "page", errors);
  const limit = readPositivePaginationInteger(query.limit, 50, "limit", errors, { max: 100 });

  if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
    errors.push("startDate must be before or equal to endDate");
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
      patientId,
      providerId,
      status,
      startDate,
      endDate,
      page,
      limit,
    },
  };
};

export const validateCreateAppointmentRequest = (
  payload: unknown,
): ValidationResult<CreateAppointmentRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const patientId = readRequiredString(payload.patientId, "patientId", errors);
  const providerId = readRequiredString(payload.providerId, "providerId", errors);
  const dateTime = readRequiredDateTime(payload.dateTime, "dateTime", errors);
  const duration = readOptionalInteger(payload.duration, "duration", errors);
  const type = normalizeType(payload.type, "type", errors, true);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });

  if (duration !== undefined && (duration < 15 || duration > 240)) {
    errors.push("duration must be between 15 and 240 minutes");
  }

  if (errors.length > 0 || !type) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      patientId,
      providerId,
      dateTime,
      duration,
      type,
      notes,
    },
  };
};

export const validateUpdateAppointmentRequest = (
  payload: unknown,
): ValidationResult<UpdateAppointmentRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const patientId = readOptionalString(payload.patientId, "patientId", errors);
  const providerId = readOptionalString(payload.providerId, "providerId", errors);
  const dateTime = readOptionalDateTime(payload.dateTime, "dateTime", errors);
  const duration = readOptionalInteger(payload.duration, "duration", errors);
  const type = normalizeType(payload.type, "type", errors, false);
  const status = normalizeStatus(payload.status, "status", errors);
  const notes = readOptionalString(payload.notes, "notes", errors, { maxLength: 2000 });
  const cancellationReason = readOptionalString(payload.cancellationReason, "cancellationReason", errors, {
    maxLength: 500,
  });

  if (duration !== undefined && (duration < 15 || duration > 240)) {
    errors.push("duration must be between 15 and 240 minutes");
  }

  const hasUpdate = [
    patientId,
    providerId,
    dateTime,
    duration,
    type,
    status,
    notes,
    cancellationReason,
  ].some((value) => value !== undefined);

  if (!hasUpdate) {
    errors.push("At least one appointment field must be provided");
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
      patientId,
      providerId,
      dateTime,
      duration,
      type,
      status,
      notes,
      cancellationReason,
    },
  };
};

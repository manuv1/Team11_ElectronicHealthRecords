import { AuditLogListQuery, AuditOutcome } from "../types/audit-log";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const allowedOutcomes: Array<AuditOutcome | "ALL"> = ["ALL", "success", "failure"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  maxLength = 100,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    errors.push(`${fieldName} must be a string`);
    return undefined;
  }

  const normalized = raw.trim();

  if (normalized.length > maxLength) {
    errors.push(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return normalized || undefined;
};

const readPositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  errors: string[],
  max?: number,
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

  if (max && parsed > max) {
    errors.push(`${fieldName} must be ${max} or less`);
    return fallback;
  }

  return parsed;
};

export const validateAuditLogListQuery = (
  query: unknown,
): ValidationResult<AuditLogListQuery> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(query)) {
    return { success: false, errors: ["Query parameters must be an object"] };
  }

  const search = readString(query.search, "search", errors, 100);
  const action = readString(query.action, "action", errors, 100);
  const resource = readString(query.resource, "resource", errors, 100);
  const userId = readString(query.userId, "userId", errors, 100);
  const outcome = readString(query.outcome, "outcome", errors, 20) as AuditOutcome | "ALL" | undefined;
  const page = readPositiveInteger(query.page, 1, "page", errors);
  const limit = readPositiveInteger(query.limit, 25, "limit", errors, 100);

  if (outcome && !allowedOutcomes.includes(outcome)) {
    errors.push(`outcome must be one of ${allowedOutcomes.join(", ")}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      search,
      action,
      resource,
      outcome: outcome ?? "ALL",
      userId,
      page,
      limit,
    },
  };
};

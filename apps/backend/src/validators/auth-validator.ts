import { LoginRequest, RefreshTokenRequest, RegisterRequest, UserRole } from "../types/auth";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const allowedRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE", "STAFF"];

const readString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options?: { minLength?: number },
): string => {
  if (typeof value !== "string") {
    errors.push(`${fieldName} is required`);
    return "";
  }

  const normalized = value.trim();

  if (!normalized) {
    errors.push(`${fieldName} is required`);
    return "";
  }

  if (options?.minLength && normalized.length < options.minLength) {
    errors.push(`${fieldName} must be at least ${options.minLength} characters`);
  }

  return normalized;
};

export const validateRegisterRequest = (
  payload: unknown,
): ValidationResult<RegisterRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const firstName = readString(payload.firstName, "firstName", errors);
  const lastName = readString(payload.lastName, "lastName", errors);
  const email = readString(payload.email, "email", errors).toLowerCase();
  const password = readString(payload.password, "password", errors, { minLength: 8 });
  const role = readString(payload.role, "role", errors).toUpperCase() as UserRole;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("email must be a valid email address");
  }

  if (password && !/[A-Z]/.test(password)) {
    errors.push("password must include at least one uppercase letter");
  }

  if (password && !/[a-z]/.test(password)) {
    errors.push("password must include at least one lowercase letter");
  }

  if (password && !/[0-9]/.test(password)) {
    errors.push("password must include at least one number");
  }

  if (role && !allowedRoles.includes(role)) {
    errors.push(`role must be one of ${allowedRoles.join(", ")}`);
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
      firstName,
      lastName,
      email,
      password,
      role,
    },
  };
};

export const validateLoginRequest = (
  payload: unknown,
): ValidationResult<LoginRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const email = readString(payload.email, "email", errors).toLowerCase();
  const password = readString(payload.password, "password", errors);

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      email,
      password,
    },
  };
};

export const validateRefreshTokenRequest = (
  payload: unknown,
): ValidationResult<RefreshTokenRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object"],
    };
  }

  const refreshToken = readString(payload.refreshToken, "refreshToken", errors);

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      refreshToken,
    },
  };
};

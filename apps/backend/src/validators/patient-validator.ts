import {
  BloodType,
  CreatePatientRequest,
  PatientGender,
  PatientListQuery,
  UpdatePatientRequest,
} from "../types/patient";

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationErrorResult {
  success: false;
  errors: string[];
}

const allowedGenders: PatientGender[] = ["MALE", "FEMALE", "OTHER"];
const allowedBloodTypes: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (
  value: unknown,
  fieldName: string,
  errors: string[],
  options: { required?: boolean; maxLength?: number } = {},
): string | undefined => {
  if (value === undefined || value === null) {
    if (options.required) errors.push(`${fieldName} is required`);
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} must be a string`);
    return undefined;
  }

  const normalized = value.trim();

  if (options.required && !normalized) errors.push(`${fieldName} is required`);
  if (options.maxLength && normalized.length > options.maxLength) {
    errors.push(`${fieldName} must be ${options.maxLength} characters or fewer`);
  }

  return normalized || undefined;
};

const readGender = (
  value: unknown,
  errors: string[],
  required: boolean,
): PatientGender | undefined => {
  const normalized = readString(value, "gender", errors, { required })?.toUpperCase();

  if (!normalized) return undefined;

  if (!allowedGenders.includes(normalized as PatientGender)) {
    errors.push(`gender must be one of ${allowedGenders.join(", ")}`);
    return undefined;
  }

  return normalized as PatientGender;
};

const readBloodType = (value: unknown, errors: string[]): BloodType | undefined => {
  const normalized = readString(value, "bloodType", errors)?.toUpperCase();

  if (!normalized) return undefined;

  if (!allowedBloodTypes.includes(normalized as BloodType)) {
    errors.push(`bloodType must be one of ${allowedBloodTypes.join(", ")}`);
    return undefined;
  }

  return normalized as BloodType;
};

const readDateOfBirth = (
  value: unknown,
  errors: string[],
  required: boolean,
): string | undefined => {
  const normalized = readString(value, "dateOfBirth", errors, { required });

  if (!normalized) return undefined;

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  const minimum = new Date("1900-01-01T00:00:00.000Z");

  if (Number.isNaN(parsed.getTime())) {
    errors.push("dateOfBirth must be a valid date");
  } else if (parsed > new Date()) {
    errors.push("Date of birth cannot be in the future");
  } else if (parsed < minimum) {
    errors.push("dateOfBirth must be on or after 1900-01-01");
  }

  return normalized;
};

const readEmail = (value: unknown, errors: string[]): string | undefined => {
  const email = readString(value, "email", errors, { maxLength: 254 });

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("email must be valid");
  }

  return email?.toLowerCase();
};

const readPhone = (value: unknown, errors: string[]): string | undefined => {
  const phone = readString(value, "phone", errors, { maxLength: 25 });

  if (phone && !/^[0-9+\-\s().]{7,25}$/.test(phone)) {
    errors.push("phone must be a valid phone number");
  }

  return phone;
};

const readAllergies = (value: unknown, errors: string[]): string[] | undefined => {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    errors.push("allergies must be an array of strings");
    return undefined;
  }

  const allergies = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  if (allergies.length !== value.length) {
    errors.push("allergies must only contain non-empty strings");
  }

  return allergies;
};

const readPositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  errors: string[],
  max?: number,
): number => {
  if (value === undefined) return fallback;

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

export const validatePatientListQuery = (
  query: unknown,
): ValidationResult<PatientListQuery> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(query)) {
    return { success: false, errors: ["Query parameters must be an object"] };
  }

  const search = readString(query.search, "search", errors, { maxLength: 100 });
  const page = readPositiveInteger(query.page, 1, "page", errors);
  const limit = readPositiveInteger(query.limit, 10, "limit", errors, 100);

  if (errors.length > 0) return { success: false, errors };

  return {
    success: true,
    data: { search, page, limit },
  };
};

export const validateCreatePatientRequest = (
  payload: unknown,
): ValidationResult<CreatePatientRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { success: false, errors: ["Request body must be a JSON object"] };
  }

  const firstName = readString(payload.firstName, "firstName", errors, {
    required: true,
    maxLength: 100,
  });
  const lastName = readString(payload.lastName, "lastName", errors, {
    required: true,
    maxLength: 100,
  });
  const dateOfBirth = readDateOfBirth(payload.dateOfBirth, errors, true);
  const gender = readGender(payload.gender, errors, true);
  const email = readEmail(payload.email, errors);
  const phone = readPhone(payload.phone, errors);
  const address = readString(payload.address, "address", errors, { maxLength: 500 });
  const bloodType = readBloodType(payload.bloodType, errors);
  const allergies = readAllergies(payload.allergies, errors);

  if (errors.length > 0 || !firstName || !lastName || !dateOfBirth || !gender) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      allergies,
    },
  };
};

export const validateUpdatePatientRequest = (
  payload: unknown,
): ValidationResult<UpdatePatientRequest> | ValidationErrorResult => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { success: false, errors: ["Request body must be a JSON object"] };
  }

  const firstName = readString(payload.firstName, "firstName", errors, { maxLength: 100 });
  const lastName = readString(payload.lastName, "lastName", errors, { maxLength: 100 });
  const dateOfBirth = readDateOfBirth(payload.dateOfBirth, errors, false);
  const gender = readGender(payload.gender, errors, false);
  const email = readEmail(payload.email, errors);
  const phone = readPhone(payload.phone, errors);
  const address = readString(payload.address, "address", errors, { maxLength: 500 });
  const bloodType = readBloodType(payload.bloodType, errors);
  const allergies = readAllergies(payload.allergies, errors);
  const hasUpdate = [
    firstName,
    lastName,
    dateOfBirth,
    gender,
    email,
    phone,
    address,
    bloodType,
    allergies,
  ].some((value) => value !== undefined);

  if (!hasUpdate) errors.push("At least one patient field must be provided");
  if (errors.length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      allergies,
    },
  };
};


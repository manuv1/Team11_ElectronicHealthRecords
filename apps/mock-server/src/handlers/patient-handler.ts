import crypto from "crypto";
import type { Request, Response } from "express";

import { mockPatients } from "../data/patients";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import type {
  BloodType,
  CreatePatientRequest,
  Patient,
  PatientGender,
  UpdatePatientRequest,
} from "../../../../packages/shared/src/types/patient.ts";

const allowedGenders: PatientGender[] = ["MALE", "FEMALE", "OTHER"];
const allowedBloodTypes: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const demographicFields = ["firstName", "lastName", "email", "phone", "address"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const readRole = (request: Request): string =>
  String(request.header("x-user-role") ?? request.header("x-role") ?? "ADMIN").toUpperCase();

const generateMrn = (): string => {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `MRN-${dateKey}-${suffix}`;
};

const parseAllergies = (value: unknown, errors: string[]): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

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

const validateDateOfBirth = (value: string | undefined, required: boolean, errors: string[]): string | undefined => {
  if (!value) {
    if (required) {
      errors.push("dateOfBirth is required");
    }
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  const minimum = new Date("1900-01-01T00:00:00.000Z");

  if (Number.isNaN(parsed.getTime())) {
    errors.push("dateOfBirth must be a valid date");
  } else if (parsed > new Date()) {
    errors.push("Date of birth cannot be in the future");
  } else if (parsed < minimum) {
    errors.push("dateOfBirth must be on or after 1900-01-01");
  }

  return value;
};

const validateEmail = (value: string | undefined, errors: string[]): string | undefined => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push("email must be valid");
  }

  return value;
};

const validatePhone = (value: string | undefined, errors: string[]): string | undefined => {
  if (value && !/^[0-9+\-\s().]{7,25}$/.test(value)) {
    errors.push("phone must be a valid phone number");
  }

  return value;
};

const validatePatientInput = (
  payload: unknown,
  mode: "create" | "update",
): { data: Partial<CreatePatientRequest & UpdatePatientRequest>; errors: string[] } => {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      data: {},
      errors: ["Request body must be a JSON object"],
    };
  }

  const firstName = normalizeString(payload.firstName);
  const lastName = normalizeString(payload.lastName);
  const dateOfBirth = validateDateOfBirth(normalizeString(payload.dateOfBirth), mode === "create", errors);
  const gender = normalizeString(payload.gender)?.toUpperCase() as PatientGender | undefined;
  const email = validateEmail(normalizeString(payload.email), errors);
  const phone = validatePhone(normalizeString(payload.phone), errors);
  const address = normalizeString(payload.address);
  const bloodType = normalizeString(payload.bloodType)?.toUpperCase() as BloodType | undefined;
  const allergies = parseAllergies(payload.allergies, errors);

  if (mode === "create" && !firstName) errors.push("firstName is required");
  if (mode === "create" && !lastName) errors.push("lastName is required");
  if (mode === "create" && !gender) errors.push("gender is required");
  if (firstName && firstName.length > 100) errors.push("firstName must be 100 characters or fewer");
  if (lastName && lastName.length > 100) errors.push("lastName must be 100 characters or fewer");
  if (gender && !allowedGenders.includes(gender)) errors.push(`gender must be one of ${allowedGenders.join(", ")}`);
  if (address && address.length > 500) errors.push("address must be 500 characters or fewer");
  if (bloodType && !allowedBloodTypes.includes(bloodType)) {
    errors.push(`bloodType must be one of ${allowedBloodTypes.join(", ")}`);
  }

  return {
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
    errors,
  };
};

const searchPatients = (search: string | undefined): Patient[] => {
  const normalizedSearch = search?.trim().toLowerCase();

  return mockPatients
    .filter((patient) => patient.isActive)
    .filter((patient) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        patient.firstName,
        patient.lastName,
        `${patient.firstName} ${patient.lastName}`,
        patient.mrn,
        patient.dateOfBirth,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

export const listMockPatients = async (request: Request, response: Response): Promise<void> => {
  const search = typeof request.query.search === "string" ? request.query.search : undefined;
  const page = Math.max(Number(request.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(request.query.limit ?? 10), 1), 100);
  const filteredPatients = searchPatients(search);
  const startIndex = (page - 1) * limit;
  const items = filteredPatients.slice(startIndex, startIndex + limit);

  response.status(200).json(
    buildMockSuccessResponse(items, "Mock patients fetched", {
      page,
      limit,
      total: filteredPatients.length,
      totalPages: Math.ceil(filteredPatients.length / limit),
    }),
  );
};

export const getMockPatient = async (request: Request, response: Response): Promise<void> => {
  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  response.status(200).json(buildMockSuccessResponse(patient, "Mock patient fetched"));
};

export const createMockPatient = async (request: Request, response: Response): Promise<void> => {
  const validation = validatePatientInput(request.body, "create");

  if (validation.errors.length > 0) {
    response.status(400).json(buildMockErrorResponse("VALIDATION_ERROR", "Patient data is invalid", validation.errors));
    return;
  }

  const now = new Date().toISOString();
  const data = validation.data as CreatePatientRequest;
  const patient: Patient = {
    id: crypto.randomUUID(),
    mrn: generateMrn(),
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    email: data.email,
    phone: data.phone,
    address: data.address,
    bloodType: data.bloodType,
    allergies: data.allergies ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  mockPatients.push(patient);
  response.status(201).json(buildMockSuccessResponse(patient, "Patient created successfully"));
};

export const updateMockPatient = async (request: Request, response: Response): Promise<void> => {
  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const role = readRole(request);
  const validation = validatePatientInput(request.body, "update");

  if (role === "STAFF" && isRecord(request.body)) {
    const restrictedFields = Object.keys(request.body).filter(
      (field) => !demographicFields.includes(field as (typeof demographicFields)[number]),
    );

    if (restrictedFields.length > 0) {
      validation.errors.push("Staff can only update demographics and contact fields");
    }
  }

  if (validation.errors.length > 0) {
    response.status(400).json(buildMockErrorResponse("VALIDATION_ERROR", "Patient data is invalid", validation.errors));
    return;
  }

  const data = validation.data;

  patient.firstName = data.firstName ?? patient.firstName;
  patient.lastName = data.lastName ?? patient.lastName;
  patient.dateOfBirth = data.dateOfBirth ?? patient.dateOfBirth;
  patient.gender = data.gender ?? patient.gender;
  patient.email = data.email ?? patient.email;
  patient.phone = data.phone ?? patient.phone;
  patient.address = data.address ?? patient.address;
  patient.bloodType = data.bloodType ?? patient.bloodType;
  patient.allergies = data.allergies ?? patient.allergies;
  patient.updatedAt = new Date().toISOString();

  response.status(200).json(buildMockSuccessResponse(patient, "Patient updated"));
};

export const deactivateMockPatient = async (request: Request, response: Response): Promise<void> => {
  if (readRole(request) !== "ADMIN") {
    response.status(403).json(buildMockErrorResponse("FORBIDDEN", "Only admins can deactivate patients"));
    return;
  }

  const patient = mockPatients.find((entry) => entry.id === request.params.id && entry.isActive);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  patient.isActive = false;
  patient.deletedAt = new Date().toISOString();
  patient.updatedAt = patient.deletedAt;

  response.status(200).json(buildMockSuccessResponse(patient, "Patient deactivated"));
};


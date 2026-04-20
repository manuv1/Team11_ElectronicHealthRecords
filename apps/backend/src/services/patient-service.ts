import crypto from "crypto";

import { mockPatientSummaries } from "../../../../packages/shared/src/mocks/patients";
import { UserRole } from "../types/auth";
import { CreatePatientRequest, Patient, PatientListQuery, UpdatePatientRequest } from "../types/patient";
import { recordAuditEntry } from "./audit-service";

export class PatientServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

interface RequestActor {
  userId?: string;
  role?: UserRole;
}

const patients: Patient[] = [...mockPatientSummaries];
const staffAllowedFields = new Set(["firstName", "lastName", "email", "phone", "address"]);

const nowIso = (): string => new Date().toISOString();

const generateMrn = (): string => {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `MRN-${dateKey}-${suffix}`;
};

const recordPatientAudit = async (
  action: string,
  patient: Patient,
  actor: RequestActor,
): Promise<void> => {
  await recordAuditEntry({
    userId: actor.userId,
    action,
    resource: "patient",
    outcome: "success",
    metadata: {
      patientId: patient.id,
      mrn: patient.mrn,
    },
  });
};

const assertPatientExists = (patientId: string): Patient => {
  const patient = patients.find((entry) => entry.id === patientId && entry.isActive);

  if (!patient) {
    throw new PatientServiceError(404, "NOT_FOUND", "Patient not found");
  }

  return patient;
};

const assertStaffUpdateScope = (input: UpdatePatientRequest, actor: RequestActor): void => {
  if (actor.role !== "STAFF") {
    return;
  }

  const restrictedFields = Object.keys(input).filter(
    (field) => input[field as keyof UpdatePatientRequest] !== undefined && !staffAllowedFields.has(field),
  );

  if (restrictedFields.length > 0) {
    throw new PatientServiceError(
      403,
      "FORBIDDEN",
      "Staff can only update demographics and contact fields",
      restrictedFields,
    );
  }
};

export const patientService = {
  async list(query: PatientListQuery): Promise<{ items: Patient[]; total: number }> {
    const normalizedSearch = query.search?.toLowerCase();
    const filteredItems = patients
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
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    const startIndex = (query.page - 1) * query.limit;

    return {
      items: filteredItems.slice(startIndex, startIndex + query.limit),
      total: filteredItems.length,
    };
  },

  async getById(patientId: string): Promise<Patient> {
    return assertPatientExists(patientId);
  },

  async create(input: CreatePatientRequest, actor: RequestActor = {}): Promise<Patient> {
    const timestamp = nowIso();
    const patient: Patient = {
      id: crypto.randomUUID(),
      mrn: generateMrn(),
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      email: input.email,
      phone: input.phone,
      address: input.address,
      bloodType: input.bloodType,
      allergies: input.allergies ?? [],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    patients.push(patient);
    await recordPatientAudit("patient.create", patient, actor);

    return patient;
  },

  async update(patientId: string, input: UpdatePatientRequest, actor: RequestActor = {}): Promise<Patient> {
    assertStaffUpdateScope(input, actor);

    const patient = assertPatientExists(patientId);

    patient.firstName = input.firstName ?? patient.firstName;
    patient.lastName = input.lastName ?? patient.lastName;
    patient.dateOfBirth = input.dateOfBirth ?? patient.dateOfBirth;
    patient.gender = input.gender ?? patient.gender;
    patient.email = input.email ?? patient.email;
    patient.phone = input.phone ?? patient.phone;
    patient.address = input.address ?? patient.address;
    patient.bloodType = input.bloodType ?? patient.bloodType;
    patient.allergies = input.allergies ?? patient.allergies;
    patient.updatedAt = nowIso();

    await recordPatientAudit("patient.update", patient, actor);

    return patient;
  },

  async deactivate(patientId: string, actor: RequestActor = {}): Promise<Patient> {
    const patient = assertPatientExists(patientId);

    patient.isActive = false;
    patient.deletedAt = nowIso();
    patient.updatedAt = patient.deletedAt;

    await recordPatientAudit("patient.deactivate", patient, actor);

    return patient;
  },
};


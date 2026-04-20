import crypto from "crypto";

import { mockMedications } from "../../../../packages/shared/src/mocks/medications";
import { UserRole } from "../types/auth";
import {
  CreateMedicationRequest,
  Medication,
  MedicationListQuery,
  UpdateMedicationRequest,
} from "../types/medication";
import { Patient } from "../types/patient";
import { recordAuditEntry } from "./audit-service";
import { patientService, PatientServiceError } from "./patient-service";

export class MedicationServiceError extends Error {
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
  email?: string;
  role?: UserRole;
}

const medications: Medication[] = [...mockMedications];
const prescribingRoles: UserRole[] = ["ADMIN", "DOCTOR"];

const nowIso = (): string => new Date().toISOString();
const todayDate = (): string => new Date().toISOString().slice(0, 10);

const getPatientOrThrow = async (patientId: string): Promise<Patient> => {
  try {
    return await patientService.getById(patientId);
  } catch (error) {
    if (error instanceof PatientServiceError) {
      throw new MedicationServiceError(error.statusCode, error.code, error.message, error.details);
    }

    throw error;
  }
};

const getPatientName = (patient: Patient): string =>
  `${patient.firstName} ${patient.lastName}`.trim();

const getAllergyWarnings = (patient: Patient, medicationName: string): string[] => {
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

const assertPrescribingScope = (actor: RequestActor): void => {
  if (!actor.role || !prescribingRoles.includes(actor.role)) {
    throw new MedicationServiceError(
      403,
      "FORBIDDEN",
      "Only doctors and admins can prescribe or discontinue medications",
    );
  }
};

const findMedicationById = (medicationId: string): Medication => {
  const medication = medications.find((entry) => entry.id === medicationId);

  if (!medication) {
    throw new MedicationServiceError(404, "NOT_FOUND", "Medication not found");
  }

  return medication;
};

const recordMedicationAudit = async (
  action: string,
  medication: Medication,
  actor: RequestActor,
): Promise<void> => {
  await recordAuditEntry({
    userId: actor.userId,
    action,
    resource: "medication",
    outcome: "success",
    metadata: {
      medicationId: medication.id,
      patientId: medication.patientId,
      status: medication.status,
    },
  });
};

export const medicationService = {
  async listAll(): Promise<Medication[]> {
    return [...medications].sort(
      (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
    );
  },

  async list(
    patientId: string,
    query: MedicationListQuery,
  ): Promise<{ items: Medication[]; total: number }> {
    await getPatientOrThrow(patientId);

    const filteredItems = medications
      .filter((medication) => medication.patientId === patientId)
      .filter((medication) => !query.status || query.status === "ALL" || medication.status === query.status)
      .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());

    const startIndex = (query.page - 1) * query.limit;

    return {
      items: filteredItems.slice(startIndex, startIndex + query.limit),
      total: filteredItems.length,
    };
  },

  async create(
    patientId: string,
    input: CreateMedicationRequest,
    actor: RequestActor = {},
  ): Promise<Medication> {
    assertPrescribingScope(actor);

    const patient = await getPatientOrThrow(patientId);
    const timestamp = nowIso();
    const medication: Medication = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: getPatientName(patient),
      name: input.name,
      dosage: input.dosage,
      frequency: input.frequency,
      route: input.route,
      prescribedBy: actor.userId ?? "unknown",
      prescribedByName: actor.email,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.endDate ? "DISCONTINUED" : "ACTIVE",
      notes: input.notes,
      allergyWarnings: getAllergyWarnings(patient, input.name),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    medications.push(medication);
    await recordMedicationAudit("medication.prescribe", medication, actor);

    return medication;
  },

  async update(
    medicationId: string,
    input: UpdateMedicationRequest,
    actor: RequestActor = {},
  ): Promise<Medication> {
    assertPrescribingScope(actor);

    const medication = findMedicationById(medicationId);
    const patient = await getPatientOrThrow(medication.patientId);
    const nextStatus = input.status ?? medication.status;

    if (medication.status === "DISCONTINUED" && nextStatus === "ACTIVE") {
      throw new MedicationServiceError(409, "CONFLICT", "Discontinued medications cannot be reactivated");
    }

    medication.name = input.name ?? medication.name;
    medication.dosage = input.dosage ?? medication.dosage;
    medication.frequency = input.frequency ?? medication.frequency;
    medication.route = input.route ?? medication.route;
    medication.startDate = input.startDate ?? medication.startDate;
    medication.endDate = input.endDate ?? medication.endDate;
    medication.notes = input.notes ?? medication.notes;
    medication.allergyWarnings = getAllergyWarnings(patient, medication.name);

    if (nextStatus === "DISCONTINUED") {
      medication.status = "DISCONTINUED";
      medication.endDate = input.endDate ?? medication.endDate ?? todayDate();
      medication.discontinuedAt = medication.discontinuedAt ?? nowIso();
      medication.discontinueReason = input.discontinueReason ?? medication.discontinueReason;
    } else {
      medication.status = "ACTIVE";
    }

    medication.updatedAt = nowIso();

    await recordMedicationAudit(
      medication.status === "DISCONTINUED" ? "medication.discontinue" : "medication.update",
      medication,
      actor,
    );

    return medication;
  },
};

import crypto from "crypto";

import { mockLabResults } from "../../../../packages/shared/src/mocks/lab-results";
import { UserRole } from "../types/auth";
import {
  CreateLabOrderRequest,
  LabResult,
  LabResultListQuery,
  UpdateLabResultRequest,
} from "../types/lab-result";
import { Patient } from "../types/patient";
import { recordAuditEntry } from "./audit-service";
import { patientService, PatientServiceError } from "./patient-service";

export class LabResultServiceError extends Error {
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

const labResults: LabResult[] = [...mockLabResults];
const orderingRoles: UserRole[] = ["ADMIN", "DOCTOR"];
const resultEntryRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE"];

const nowIso = (): string => new Date().toISOString();

const getPatientOrThrow = async (patientId: string): Promise<Patient> => {
  try {
    return await patientService.getById(patientId);
  } catch (error) {
    if (error instanceof PatientServiceError) {
      throw new LabResultServiceError(error.statusCode, error.code, error.message, error.details);
    }

    throw error;
  }
};

const getPatientName = (patient: Patient): string =>
  `${patient.firstName} ${patient.lastName}`.trim();

const assertRoleScope = (
  actor: RequestActor,
  allowedRoles: UserRole[],
  message: string,
): void => {
  if (!actor.role || !allowedRoles.includes(actor.role)) {
    throw new LabResultServiceError(403, "FORBIDDEN", message);
  }
};

const findLabResultById = (labResultId: string): LabResult => {
  const labResult = labResults.find((entry) => entry.id === labResultId);

  if (!labResult) {
    throw new LabResultServiceError(404, "NOT_FOUND", "Lab result not found");
  }

  return labResult;
};

const recordLabAudit = async (
  action: string,
  labResult: LabResult,
  actor: RequestActor,
): Promise<void> => {
  await recordAuditEntry({
    userId: actor.userId,
    action,
    resource: "lab-result",
    outcome: "success",
    metadata: {
      labResultId: labResult.id,
      patientId: labResult.patientId,
      status: labResult.status,
      isAbnormal: labResult.isAbnormal,
    },
  });
};

export const labResultService = {
  async listAll(): Promise<LabResult[]> {
    return [...labResults].sort(
      (left, right) => new Date(right.orderedAt).getTime() - new Date(left.orderedAt).getTime(),
    );
  },

  async list(
    patientId: string,
    query: LabResultListQuery,
  ): Promise<{ items: LabResult[]; total: number }> {
    await getPatientOrThrow(patientId);

    const filteredItems = labResults
      .filter((labResult) => labResult.patientId === patientId)
      .filter((labResult) => !query.status || query.status === "ALL" || labResult.status === query.status)
      .filter((labResult) => query.abnormal === undefined || Boolean(labResult.isAbnormal) === query.abnormal)
      .sort((left, right) => new Date(right.orderedAt).getTime() - new Date(left.orderedAt).getTime());

    const startIndex = (query.page - 1) * query.limit;

    return {
      items: filteredItems.slice(startIndex, startIndex + query.limit),
      total: filteredItems.length,
    };
  },

  async create(
    patientId: string,
    input: CreateLabOrderRequest,
    actor: RequestActor = {},
  ): Promise<LabResult> {
    assertRoleScope(actor, orderingRoles, "Only doctors and admins can order lab tests");

    const patient = await getPatientOrThrow(patientId);
    const timestamp = nowIso();
    const orderedAt = input.orderedAt ?? timestamp;
    const labResult: LabResult = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: getPatientName(patient),
      testName: input.testName,
      testCode: input.testCode,
      status: "PENDING",
      orderedBy: actor.userId ?? "unknown",
      orderedByName: actor.email,
      orderedAt,
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    labResults.push(labResult);
    await recordLabAudit("lab.order", labResult, actor);

    return labResult;
  },

  async update(
    labResultId: string,
    input: UpdateLabResultRequest,
    actor: RequestActor = {},
  ): Promise<LabResult> {
    assertRoleScope(actor, resultEntryRoles, "Only clinical users can enter or update lab results");

    const labResult = findLabResultById(labResultId);
    await getPatientOrThrow(labResult.patientId);

    labResult.testName = input.testName ?? labResult.testName;
    labResult.testCode = input.testCode ?? labResult.testCode;
    labResult.result = input.result ?? labResult.result;
    labResult.unit = input.unit ?? labResult.unit;
    labResult.normalRange = input.normalRange ?? labResult.normalRange;
    labResult.isAbnormal = input.isAbnormal ?? labResult.isAbnormal;
    labResult.notes = input.notes ?? labResult.notes;

    if (input.status) {
      labResult.status = input.status;
    } else if (input.result && labResult.status !== "COMPLETED") {
      labResult.status = "COMPLETED";
    }

    if (labResult.status === "COMPLETED") {
      labResult.resultedAt = input.resultedAt ?? labResult.resultedAt ?? nowIso();
    } else {
      labResult.resultedAt = input.resultedAt ?? labResult.resultedAt;
    }

    labResult.updatedAt = nowIso();

    await recordLabAudit(
      labResult.status === "COMPLETED" ? "lab.result.enter" : "lab.result.update",
      labResult,
      actor,
    );

    return labResult;
  },
};

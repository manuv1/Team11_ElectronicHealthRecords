import type { AuditLog } from "../types/audit-log.ts";

const now = Date.now();

const minutesAgo = (minutes: number): string =>
  new Date(now - minutes * 60 * 1000).toISOString();

export const mockAuditLogs: AuditLog[] = [
  {
    id: "aud_001",
    userId: "usr_admin_001",
    action: "auth.login",
    resource: "auth",
    outcome: "success",
    metadata: { email: "[redacted]" },
    createdAt: minutesAgo(8),
  },
  {
    id: "aud_002",
    userId: "usr_doctor_001",
    action: "patient.update",
    resource: "patient",
    outcome: "success",
    metadata: { patientId: "pat_001", mrn: "[redacted]" },
    createdAt: minutesAgo(24),
  },
  {
    id: "aud_003",
    userId: "usr_nurse_001",
    action: "lab.result",
    resource: "lab-result",
    outcome: "success",
    metadata: { labResultId: "lab_001", patientId: "pat_002" },
    createdAt: minutesAgo(52),
  },
  {
    id: "aud_004",
    action: "auth.login",
    resource: "auth",
    outcome: "failure",
    metadata: { reason: "invalid_credentials", email: "[redacted]" },
    createdAt: minutesAgo(90),
  },
  {
    id: "aud_005",
    userId: "usr_doctor_001",
    action: "medication.prescribe",
    resource: "medication",
    outcome: "success",
    metadata: { medicationId: "med_001", patientId: "pat_001" },
    createdAt: minutesAgo(140),
  },
];

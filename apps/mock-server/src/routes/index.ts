import { Router } from "express";
import type { Express } from "express";

import {
  cancelMockAppointment,
  createMockAppointment,
  getMockAppointment,
  listMockAppointments,
  updateMockAppointment,
} from "../handlers/appointment-handler";
import { listMockAuditLogs } from "../handlers/audit-log-handler";
import {
  assignMockUserRole,
  listMockUsers,
  loginMockUser,
  refreshMockSession,
  registerMockUser,
} from "../handlers/auth-handler";
import { getMockHealthStatus } from "../handlers/health-handler";
import {
  createMockPatientLabOrder,
  listMockPatientLabResults,
  updateMockLabResult,
} from "../handlers/lab-result-handler";
import {
  createMockPatientMedication,
  listMockPatientMedications,
  updateMockMedication,
} from "../handlers/medication-handler";
import {
  exportMockPatientFhirBundle,
  exportMockPatientObservationBundle,
} from "../handlers/fhir-handler";
import {
  createMockPatient,
  deactivateMockPatient,
  getMockPatient,
  listMockPatients,
  updateMockPatient,
} from "../handlers/patient-handler";
import { requireMockAuth, requireMockRoles } from "../middleware/auth-middleware";
import { getMockOperationalReport } from "../handlers/report-handler";

export const registerMockRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getMockHealthStatus);
  router.post("/auth/register", registerMockUser);
  router.post("/auth/login", loginMockUser);
  router.post("/auth/refresh", refreshMockSession);
  router.get("/auth/users", requireMockAuth, requireMockRoles("ADMIN"), listMockUsers);
  router.patch("/auth/users/:userId/role", requireMockAuth, requireMockRoles("ADMIN"), assignMockUserRole);
  router.get("/audit-logs", requireMockAuth, requireMockRoles("ADMIN"), listMockAuditLogs);
  router.get("/reports/operational", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), getMockOperationalReport);
  router.get("/fhir/patients/:id/export", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), exportMockPatientFhirBundle);
  router.get("/fhir/patients/:id/observations", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), exportMockPatientObservationBundle);
  router.get("/patients", requireMockAuth, listMockPatients);
  router.get("/patients/:id/labs", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), listMockPatientLabResults);
  router.post("/patients/:id/labs", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR"), createMockPatientLabOrder);
  router.get("/patients/:id/medications", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), listMockPatientMedications);
  router.post("/patients/:id/medications", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR"), createMockPatientMedication);
  router.get("/patients/:id", requireMockAuth, getMockPatient);
  router.post("/patients", requireMockAuth, createMockPatient);
  router.put("/patients/:id", requireMockAuth, updateMockPatient);
  router.delete("/patients/:id", requireMockAuth, requireMockRoles("ADMIN"), deactivateMockPatient);
  router.put("/labs/:id", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR", "NURSE"), updateMockLabResult);
  router.put("/medications/:id", requireMockAuth, requireMockRoles("ADMIN", "DOCTOR"), updateMockMedication);
  router.get("/appointments", requireMockAuth, listMockAppointments);
  router.get("/appointments/:id", requireMockAuth, getMockAppointment);
  router.post("/appointments", requireMockAuth, createMockAppointment);
  router.put("/appointments/:id", requireMockAuth, updateMockAppointment);
  router.delete("/appointments/:id", requireMockAuth, cancelMockAppointment);

  app.use("/api/v1", router);
};

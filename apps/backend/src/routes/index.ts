import { Express, Router } from "express";

import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from "../controllers/appointment-controller";
import { listAuditLogs } from "../controllers/audit-log-controller";
import {
  assignUserRole,
  listUsers,
  loginUser,
  refreshUserSession,
  registerUser,
} from "../controllers/auth-controller";
import { getHealthStatus } from "../controllers/health-controller";
import {
  createPatientLabOrder,
  listPatientLabResults,
  updateLabResult,
} from "../controllers/lab-result-controller";
import {
  createPatientMedication,
  listPatientMedications,
  updateMedication,
} from "../controllers/medication-controller";
import {
  exportPatientFhirBundle,
  exportPatientObservationBundle,
} from "../controllers/fhir-controller";
import {
  createPatient,
  deactivatePatient,
  getPatient,
  listPatients,
  updatePatient,
} from "../controllers/patient-controller";
import { getOperationalReport } from "../controllers/report-controller";
import { requireAuth, requireRoles } from "../middleware/auth-middleware";

export const registerRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getHealthStatus);
  router.post("/auth/register", registerUser);
  router.post("/auth/login", loginUser);
  router.post("/auth/refresh", refreshUserSession);
  router.get("/auth/users", requireAuth, requireRoles("ADMIN"), listUsers);
  router.patch("/auth/users/:userId/role", requireAuth, requireRoles("ADMIN"), assignUserRole);
  router.get("/audit-logs", requireAuth, requireRoles("ADMIN"), listAuditLogs);
  router.get("/reports/operational", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), getOperationalReport);
  router.get("/fhir/patients/:id/export", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), exportPatientFhirBundle);
  router.get("/fhir/patients/:id/observations", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), exportPatientObservationBundle);
  router.get("/patients", requireAuth, listPatients);
  router.get("/patients/:id/labs", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), listPatientLabResults);
  router.post("/patients/:id/labs", requireAuth, requireRoles("ADMIN", "DOCTOR"), createPatientLabOrder);
  router.get("/patients/:id/medications", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), listPatientMedications);
  router.post("/patients/:id/medications", requireAuth, requireRoles("ADMIN", "DOCTOR"), createPatientMedication);
  router.get("/patients/:id", requireAuth, getPatient);
  router.post("/patients", requireAuth, createPatient);
  router.put("/patients/:id", requireAuth, updatePatient);
  router.delete("/patients/:id", requireAuth, requireRoles("ADMIN"), deactivatePatient);
  router.put("/labs/:id", requireAuth, requireRoles("ADMIN", "DOCTOR", "NURSE"), updateLabResult);
  router.put("/medications/:id", requireAuth, requireRoles("ADMIN", "DOCTOR"), updateMedication);
  router.get("/appointments", requireAuth, listAppointments);
  router.get("/appointments/:id", requireAuth, getAppointment);
  router.post("/appointments", requireAuth, createAppointment);
  router.put("/appointments/:id", requireAuth, updateAppointment);
  router.delete("/appointments/:id", requireAuth, cancelAppointment);

  app.use("/api/v1", router);
};

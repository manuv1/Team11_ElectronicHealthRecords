import { Router } from "express";
import type { Express } from "express";

import {
  cancelMockAppointment,
  createMockAppointment,
  getMockAppointment,
  listMockAppointments,
  updateMockAppointment,
} from "../handlers/appointment-handler";
import {
  assignMockUserRole,
  listMockUsers,
  loginMockUser,
  refreshMockSession,
  registerMockUser,
} from "../handlers/auth-handler";
import { getMockHealthStatus } from "../handlers/health-handler";
import {
  createMockPatient,
  deactivateMockPatient,
  getMockPatient,
  listMockPatients,
  updateMockPatient,
} from "../handlers/patient-handler";

export const registerMockRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getMockHealthStatus);
  router.post("/auth/register", registerMockUser);
  router.post("/auth/login", loginMockUser);
  router.post("/auth/refresh", refreshMockSession);
  router.get("/auth/users", listMockUsers);
  router.patch("/auth/users/:userId/role", assignMockUserRole);
  router.get("/patients", listMockPatients);
  router.get("/patients/:id", getMockPatient);
  router.post("/patients", createMockPatient);
  router.put("/patients/:id", updateMockPatient);
  router.delete("/patients/:id", deactivateMockPatient);
  router.get("/appointments", listMockAppointments);
  router.get("/appointments/:id", getMockAppointment);
  router.post("/appointments", createMockAppointment);
  router.put("/appointments/:id", updateMockAppointment);
  router.delete("/appointments/:id", cancelMockAppointment);

  app.use("/api/v1", router);
};

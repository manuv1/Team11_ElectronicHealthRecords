import { Express, Router } from "express";

import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from "../controllers/appointment-controller";
import {
  assignUserRole,
  listUsers,
  loginUser,
  refreshUserSession,
  registerUser,
} from "../controllers/auth-controller";
import { getHealthStatus } from "../controllers/health-controller";
import {
  createPatient,
  deactivatePatient,
  getPatient,
  listPatients,
  updatePatient,
} from "../controllers/patient-controller";
import { requireAuth, requireRoles } from "../middleware/auth-middleware";

export const registerRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getHealthStatus);
  router.post("/auth/register", registerUser);
  router.post("/auth/login", loginUser);
  router.post("/auth/refresh", refreshUserSession);
  router.get("/auth/users", requireAuth, requireRoles("ADMIN"), listUsers);
  router.patch("/auth/users/:userId/role", requireAuth, requireRoles("ADMIN"), assignUserRole);
  router.get("/patients", requireAuth, listPatients);
  router.get("/patients/:id", requireAuth, getPatient);
  router.post("/patients", requireAuth, createPatient);
  router.put("/patients/:id", requireAuth, updatePatient);
  router.delete("/patients/:id", requireAuth, requireRoles("ADMIN"), deactivatePatient);
  router.get("/appointments", requireAuth, listAppointments);
  router.get("/appointments/:id", requireAuth, getAppointment);
  router.post("/appointments", requireAuth, createAppointment);
  router.put("/appointments/:id", requireAuth, updateAppointment);
  router.delete("/appointments/:id", requireAuth, cancelAppointment);

  app.use("/api/v1", router);
};

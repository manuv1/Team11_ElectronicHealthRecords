import { Express, Router } from "express";

import { loginMockUser, refreshMockSession, registerMockUser } from "../handlers/auth-handler";
import { getMockHealthStatus } from "../handlers/health-handler";
import { listMockPatients } from "../handlers/patient-handler";

export const registerMockRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getMockHealthStatus);
  router.post("/auth/register", registerMockUser);
  router.post("/auth/login", loginMockUser);
  router.post("/auth/refresh", refreshMockSession);
  router.get("/patients", listMockPatients);

  app.use("/api/v1", router);
};

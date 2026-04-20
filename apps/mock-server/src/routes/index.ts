import { Express, Router } from "express";

import { getMockHealthStatus } from "../handlers/health-handler";
import { listMockPatients } from "../handlers/patient-handler";

export const registerMockRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getMockHealthStatus);
  router.get("/patients", listMockPatients);

  app.use("/api/v1", router);
};

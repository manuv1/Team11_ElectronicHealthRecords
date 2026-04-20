import { Express, Router } from "express";

import { getHealthStatus } from "../controllers/health-controller";

export const registerRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getHealthStatus);

  app.use("/api/v1", router);
};

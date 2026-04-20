import { Express, Router } from "express";

import { loginUser, refreshUserSession, registerUser } from "../controllers/auth-controller";
import { getHealthStatus } from "../controllers/health-controller";

export const registerRoutes = (app: Express): void => {
  const router = Router();

  router.get("/health", getHealthStatus);
  router.post("/auth/register", registerUser);
  router.post("/auth/login", loginUser);
  router.post("/auth/refresh", refreshUserSession);

  app.use("/api/v1", router);
};

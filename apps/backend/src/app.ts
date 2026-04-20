import express from "express";

import {
  applyCorsPolicy,
  applySecurityHeaders,
  createRateLimiter,
  handleMalformedJson,
} from "./middleware/security-middleware";
import { registerRoutes } from "./routes";

export const createApp = (): express.Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  app.use(applyCorsPolicy);
  app.use("/api/v1/auth", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 50 }));
  app.use(express.json({ limit: "100kb" }));
  app.use(handleMalformedJson);
  registerRoutes(app);

  return app;
};

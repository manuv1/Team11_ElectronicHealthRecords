import express from "express";

import { registerRoutes } from "./routes";

export const createApp = (): express.Express => {
  const app = express();

  app.use(express.json());
  registerRoutes(app);

  return app;
};

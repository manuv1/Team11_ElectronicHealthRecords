import express from "express";

import { registerMockRoutes } from "./routes";

export const createMockServer = (): express.Express => {
  const app = express();

  app.use(express.json());
  registerMockRoutes(app);

  return app;
};

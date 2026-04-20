import express from "express";

import { registerMockRoutes } from "./routes";

export const createMockServer = (): express.Express => {
  const app = express();

  app.use((request, response, next) => {
    response.header("Access-Control-Allow-Origin", request.header("Origin") ?? "*");
    response.header("Vary", "Origin");
    response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role");
    response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }

    next();
  });
  app.use(express.json());
  registerMockRoutes(app);

  return app;
};

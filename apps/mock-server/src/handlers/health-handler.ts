import { Request, Response } from "express";

import { buildMockSuccessResponse } from "../utils/response";

export const getMockHealthStatus = async (_request: Request, response: Response): Promise<void> => {
  response.status(200).json(
    buildMockSuccessResponse(
      {
        service: "mock-server",
        status: "ok",
      },
      "Mock EHR API is running",
    ),
  );
};

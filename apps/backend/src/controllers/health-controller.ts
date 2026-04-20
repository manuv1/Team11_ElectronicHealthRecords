import { Request, Response } from "express";

import { buildSuccessResponse } from "../utils/response";

export const getHealthStatus = async (_request: Request, response: Response): Promise<void> => {
  response.status(200).json(
    buildSuccessResponse(
      {
        service: "backend",
        status: "ok",
      },
      "EHR API is running",
    ),
  );
};

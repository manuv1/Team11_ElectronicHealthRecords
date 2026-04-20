import { Request, Response } from "express";

import { reportService } from "../services/report-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";

export const getOperationalReport = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  try {
    const report = await reportService.getOperationalSummary();

    response.status(200).json(buildSuccessResponse(report, "Operational report fetched"));
  } catch {
    response.status(500).json(buildErrorResponse("SERVER_ERROR", "Report request failed"));
  }
};

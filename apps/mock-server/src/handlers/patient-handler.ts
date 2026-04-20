import { Request, Response } from "express";

import { mockPatients } from "../data/patients";
import { buildMockSuccessResponse } from "../utils/response";

export const listMockPatients = async (_request: Request, response: Response): Promise<void> => {
  response.status(200).json(
    buildMockSuccessResponse(mockPatients, "Mock patients fetched", {
      page: 1,
      limit: mockPatients.length,
      total: mockPatients.length,
    }),
  );
};

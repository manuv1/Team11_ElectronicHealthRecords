import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { labResultService, LabResultServiceError } from "../services/lab-result-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import {
  validateCreateLabOrderRequest,
  validateLabResultListQuery,
  validateUpdateLabResultRequest,
} from "../validators/lab-result-validator";

const getActor = (request: Request) => {
  const auth = (request as AuthenticatedRequest).auth;

  return {
    userId: auth?.userId,
    email: auth?.email,
    role: auth?.role,
  };
};

const handleLabResultError = (error: unknown, response: Response): void => {
  if (error instanceof LabResultServiceError) {
    response
      .status(error.statusCode)
      .json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response.status(500).json(buildErrorResponse("SERVER_ERROR", "Lab result request failed"));
};

export const listPatientLabResults = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateLabResultListQuery(request.query);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Lab result filters are invalid", validation.errors));
    return;
  }

  try {
    const result = await labResultService.list(request.params.id, validation.data);
    const totalPages = Math.ceil(result.total / validation.data.limit);

    response.status(200).json(
      buildSuccessResponse(result.items, "Lab results fetched", {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.total,
        totalPages,
      }),
    );
  } catch (error) {
    handleLabResultError(error, response);
  }
};

export const createPatientLabOrder = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateCreateLabOrderRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Lab order data is invalid", validation.errors));
    return;
  }

  try {
    const labResult = await labResultService.create(
      request.params.id,
      validation.data,
      getActor(request),
    );

    response.status(201).json(buildSuccessResponse(labResult, "Lab test ordered"));
  } catch (error) {
    handleLabResultError(error, response);
  }
};

export const updateLabResult = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateUpdateLabResultRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Lab result data is invalid", validation.errors));
    return;
  }

  try {
    const labResult = await labResultService.update(
      request.params.id,
      validation.data,
      getActor(request),
    );

    response.status(200).json(buildSuccessResponse(labResult, "Lab result updated"));
  } catch (error) {
    handleLabResultError(error, response);
  }
};

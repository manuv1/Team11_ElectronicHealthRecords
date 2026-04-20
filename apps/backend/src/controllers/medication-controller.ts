import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { medicationService, MedicationServiceError } from "../services/medication-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import {
  validateCreateMedicationRequest,
  validateMedicationListQuery,
  validateUpdateMedicationRequest,
} from "../validators/medication-validator";

const getActor = (request: Request) => {
  const auth = (request as AuthenticatedRequest).auth;

  return {
    userId: auth?.userId,
    email: auth?.email,
    role: auth?.role,
  };
};

const handleMedicationError = (error: unknown, response: Response): void => {
  if (error instanceof MedicationServiceError) {
    response
      .status(error.statusCode)
      .json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response.status(500).json(buildErrorResponse("SERVER_ERROR", "Medication request failed"));
};

export const listPatientMedications = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateMedicationListQuery(request.query);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Medication filters are invalid", validation.errors));
    return;
  }

  try {
    const result = await medicationService.list(request.params.id, validation.data);
    const totalPages = Math.ceil(result.total / validation.data.limit);

    response.status(200).json(
      buildSuccessResponse(result.items, "Medications fetched", {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.total,
        totalPages,
      }),
    );
  } catch (error) {
    handleMedicationError(error, response);
  }
};

export const createPatientMedication = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateCreateMedicationRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Medication data is invalid", validation.errors));
    return;
  }

  try {
    const medication = await medicationService.create(
      request.params.id,
      validation.data,
      getActor(request),
    );

    response.status(201).json(buildSuccessResponse(medication, "Medication prescribed"));
  } catch (error) {
    handleMedicationError(error, response);
  }
};

export const updateMedication = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const validation = validateUpdateMedicationRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Medication data is invalid", validation.errors));
    return;
  }

  try {
    const medication = await medicationService.update(
      request.params.id,
      validation.data,
      getActor(request),
    );

    response.status(200).json(buildSuccessResponse(medication, "Medication updated"));
  } catch (error) {
    handleMedicationError(error, response);
  }
};

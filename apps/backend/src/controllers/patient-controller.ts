import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { patientService, PatientServiceError } from "../services/patient-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import {
  validateCreatePatientRequest,
  validatePatientListQuery,
  validateUpdatePatientRequest,
} from "../validators/patient-validator";

const getActor = (request: Request) => {
  const auth = (request as AuthenticatedRequest).auth;

  return {
    userId: auth?.userId,
    role: auth?.role,
  };
};

const handlePatientError = (error: unknown, response: Response): void => {
  if (error instanceof PatientServiceError) {
    response
      .status(error.statusCode)
      .json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response.status(500).json(buildErrorResponse("SERVER_ERROR", "Patient request failed"));
};

export const listPatients = async (request: Request, response: Response): Promise<void> => {
  const validation = validatePatientListQuery(request.query);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Patient filters are invalid", validation.errors));
    return;
  }

  try {
    const result = await patientService.list(validation.data);

    response.status(200).json(
      buildSuccessResponse(result.items, "Patients fetched", {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / validation.data.limit),
      }),
    );
  } catch (error) {
    handlePatientError(error, response);
  }
};

export const getPatient = async (request: Request, response: Response): Promise<void> => {
  try {
    const patient = await patientService.getById(request.params.id);

    response.status(200).json(buildSuccessResponse(patient, "Patient fetched"));
  } catch (error) {
    handlePatientError(error, response);
  }
};

export const createPatient = async (request: Request, response: Response): Promise<void> => {
  const validation = validateCreatePatientRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Patient data is invalid", validation.errors));
    return;
  }

  try {
    const patient = await patientService.create(validation.data, getActor(request));

    response.status(201).json(buildSuccessResponse(patient, "Patient created successfully"));
  } catch (error) {
    handlePatientError(error, response);
  }
};

export const updatePatient = async (request: Request, response: Response): Promise<void> => {
  const validation = validateUpdatePatientRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Patient data is invalid", validation.errors));
    return;
  }

  try {
    const patient = await patientService.update(request.params.id, validation.data, getActor(request));

    response.status(200).json(buildSuccessResponse(patient, "Patient updated"));
  } catch (error) {
    handlePatientError(error, response);
  }
};

export const deactivatePatient = async (request: Request, response: Response): Promise<void> => {
  try {
    const patient = await patientService.deactivate(request.params.id, getActor(request));

    response.status(200).json(buildSuccessResponse(patient, "Patient deactivated"));
  } catch (error) {
    handlePatientError(error, response);
  }
};


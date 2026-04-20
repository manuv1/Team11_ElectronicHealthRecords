import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { fhirService } from "../services/fhir-service";
import { LabResultServiceError } from "../services/lab-result-service";
import { MedicationServiceError } from "../services/medication-service";
import { PatientServiceError } from "../services/patient-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";

const getActor = (request: Request) => {
  const auth = (request as AuthenticatedRequest).auth;

  return {
    userId: auth?.userId,
    role: auth?.role,
  };
};

const handleFhirError = (error: unknown, response: Response): void => {
  if (
    error instanceof PatientServiceError ||
    error instanceof LabResultServiceError ||
    error instanceof MedicationServiceError
  ) {
    response.status(error.statusCode).json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response.status(500).json(buildErrorResponse("SERVER_ERROR", "FHIR export request failed"));
};

export const exportPatientFhirBundle = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const bundle = await fhirService.exportPatientRecord(request.params.id, getActor(request));

    response.status(200).json(buildSuccessResponse(bundle, "FHIR patient bundle exported"));
  } catch (error) {
    handleFhirError(error, response);
  }
};

export const exportPatientObservationBundle = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const bundle = await fhirService.exportPatientObservations(request.params.id, getActor(request));

    response.status(200).json(buildSuccessResponse(bundle, "FHIR observation bundle exported"));
  } catch (error) {
    handleFhirError(error, response);
  }
};

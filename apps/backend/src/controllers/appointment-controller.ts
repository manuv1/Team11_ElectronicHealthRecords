import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { appointmentService, AppointmentServiceError } from "../services/appointment-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import {
  validateAppointmentListQuery,
  validateCreateAppointmentRequest,
  validateUpdateAppointmentRequest,
} from "../validators/appointment-validator";

const getActor = (request: Request) => {
  const auth = (request as AuthenticatedRequest).auth;

  return {
    userId: auth?.userId,
    role: auth?.role,
  };
};

const handleAppointmentError = (error: unknown, response: Response): void => {
  if (error instanceof AppointmentServiceError) {
    response
      .status(error.statusCode)
      .json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response
    .status(500)
    .json(buildErrorResponse("SERVER_ERROR", "Appointment request failed"));
};

export const listAppointments = async (request: Request, response: Response): Promise<void> => {
  const validation = validateAppointmentListQuery(request.query);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Appointment filters are invalid", validation.errors));
    return;
  }

  try {
    const result = await appointmentService.list(validation.data);
    const totalPages = Math.ceil(result.total / validation.data.limit);

    response.status(200).json(
      buildSuccessResponse(result.items, "Appointments fetched", {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.total,
        totalPages,
      }),
    );
  } catch (error) {
    handleAppointmentError(error, response);
  }
};

export const getAppointment = async (request: Request, response: Response): Promise<void> => {
  try {
    const appointment = await appointmentService.getById(request.params.id);

    response.status(200).json(buildSuccessResponse(appointment, "Appointment fetched"));
  } catch (error) {
    handleAppointmentError(error, response);
  }
};

export const createAppointment = async (request: Request, response: Response): Promise<void> => {
  const validation = validateCreateAppointmentRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Appointment data is invalid", validation.errors));
    return;
  }

  try {
    const appointment = await appointmentService.create(validation.data, getActor(request));

    response.status(201).json(buildSuccessResponse(appointment, "Appointment created"));
  } catch (error) {
    handleAppointmentError(error, response);
  }
};

export const updateAppointment = async (request: Request, response: Response): Promise<void> => {
  const validation = validateUpdateAppointmentRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Appointment data is invalid", validation.errors));
    return;
  }

  try {
    const appointment = await appointmentService.update(
      request.params.id,
      validation.data,
      getActor(request),
    );

    response.status(200).json(buildSuccessResponse(appointment, "Appointment updated"));
  } catch (error) {
    handleAppointmentError(error, response);
  }
};

export const cancelAppointment = async (request: Request, response: Response): Promise<void> => {
  const cancellationReason =
    typeof request.body?.cancellationReason === "string"
      ? request.body.cancellationReason.trim()
      : undefined;

  try {
    const appointment = await appointmentService.cancel(request.params.id, getActor(request), cancellationReason);

    response.status(200).json(buildSuccessResponse(appointment, "Appointment cancelled"));
  } catch (error) {
    handleAppointmentError(error, response);
  }
};


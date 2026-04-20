import { Request, Response } from "express";

import { authService, AuthServiceError } from "../services/auth-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import {
  validateLoginRequest,
  validateRefreshTokenRequest,
  validateRegisterRequest,
} from "../validators/auth-validator";

const buildRequestContext = (request: Request) => ({
  ipAddress: request.ip,
  userAgent: request.headers["user-agent"],
});

const handleAuthError = (error: unknown, response: Response): void => {
  if (error instanceof AuthServiceError) {
    response
      .status(error.statusCode)
      .json(buildErrorResponse(error.code, error.message, error.details));
    return;
  }

  response
    .status(500)
    .json(buildErrorResponse("AUTH_INTERNAL_ERROR", "Authentication request failed"));
};

export const registerUser = async (request: Request, response: Response): Promise<void> => {
  const validation = validateRegisterRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("AUTH_VALIDATION_ERROR", "Registration data is invalid", validation.errors));
    return;
  }

  try {
    const payload = await authService.register(validation.data, buildRequestContext(request));

    response.status(201).json(buildSuccessResponse(payload, "User registered successfully"));
  } catch (error) {
    handleAuthError(error, response);
  }
};

export const loginUser = async (request: Request, response: Response): Promise<void> => {
  const validation = validateLoginRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("AUTH_VALIDATION_ERROR", "Login data is invalid", validation.errors));
    return;
  }

  try {
    const payload = await authService.login(validation.data, buildRequestContext(request));

    response.status(200).json(buildSuccessResponse(payload, "Login successful"));
  } catch (error) {
    handleAuthError(error, response);
  }
};

export const refreshUserSession = async (request: Request, response: Response): Promise<void> => {
  const validation = validateRefreshTokenRequest(request.body);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("AUTH_VALIDATION_ERROR", "Refresh token is invalid", validation.errors));
    return;
  }

  try {
    const payload = await authService.refresh(validation.data.refreshToken, buildRequestContext(request));

    response.status(200).json(buildSuccessResponse(payload, "Session refreshed"));
  } catch (error) {
    handleAuthError(error, response);
  }
};

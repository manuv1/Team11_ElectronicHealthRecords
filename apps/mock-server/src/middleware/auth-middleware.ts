import { NextFunction, Request, Response } from "express";

import { getMockAccessTokenSession } from "../handlers/auth-handler";
import { buildMockErrorResponse } from "../utils/response";
import type { UserRole } from "../../../../packages/shared/src/types/auth.ts";

export interface MockAuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: UserRole;
  };
}

const getBearerToken = (request: Request): string | null => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireMockAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(request);

  if (!token) {
    response.status(401).json(buildMockErrorResponse("AUTH_UNAUTHORIZED", "Missing bearer token"));
    return;
  }

  const session = getMockAccessTokenSession(token);

  if (!session) {
    response
      .status(401)
      .json(buildMockErrorResponse("AUTH_UNAUTHORIZED", "Access token is invalid or expired"));
    return;
  }

  (request as MockAuthenticatedRequest).auth = {
    userId: session.userId,
    role: session.role,
  };

  next();
};

export const requireMockRoles =
  (...allowedRoles: UserRole[]) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const authenticatedRequest = request as MockAuthenticatedRequest;

    if (!authenticatedRequest.auth) {
      response.status(401).json(buildMockErrorResponse("AUTH_UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (!allowedRoles.includes(authenticatedRequest.auth.role)) {
      response
        .status(403)
        .json(buildMockErrorResponse("AUTH_FORBIDDEN", "You do not have permission to access this resource"));
      return;
    }

    next();
  };

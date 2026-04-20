import { NextFunction, Request, Response } from "express";

import { UserRole } from "../types/auth";
import { buildErrorResponse } from "../utils/response";
import { verifySignedToken } from "../utils/token";

interface AccessTokenPayload {
  sub: string;
  type: "access";
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    email: string;
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

export const requireAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(request);

  if (!token) {
    response.status(401).json(buildErrorResponse("AUTH_UNAUTHORIZED", "Missing bearer token"));
    return;
  }

  const payload = verifySignedToken<AccessTokenPayload>(token);

  if (!payload || payload.type !== "access") {
    response.status(401).json(buildErrorResponse("AUTH_UNAUTHORIZED", "Access token is invalid or expired"));
    return;
  }

  (request as AuthenticatedRequest).auth = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};

export const requireRoles =
  (...allowedRoles: UserRole[]) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.auth) {
      response.status(401).json(buildErrorResponse("AUTH_UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (!allowedRoles.includes(authenticatedRequest.auth.role)) {
      response.status(403).json(buildErrorResponse("AUTH_FORBIDDEN", "You do not have permission to access this resource"));
      return;
    }

    next();
  };

import crypto from "crypto";
import { Request, Response } from "express";

import { mockUsers } from "../data/auth-users";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import { AuthPayload, UserRole } from "../../../../packages/shared/src/types/auth";

const allowedRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE", "STAFF"];
const refreshTokens = new Map<string, { userId: string; expiresAt: string }>();

const buildPayload = (userId: string): AuthPayload | null => {
  const user = mockUsers.find((entry) => entry.id === userId);

  if (!user) {
    return null;
  }

  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  refreshTokens.set(refreshToken, {
    userId: user.id,
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    },
  };
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const registerMockUser = async (request: Request, response: Response): Promise<void> => {
  const { firstName, lastName, email, password, role } = request.body as Record<string, string>;
  const errors: string[] = [];

  if (!firstName?.trim()) errors.push("firstName is required");
  if (!lastName?.trim()) errors.push("lastName is required");
  if (!email?.trim()) errors.push("email is required");
  if (email && !isValidEmail(email.trim().toLowerCase())) errors.push("email must be valid");
  if (!password?.trim()) errors.push("password is required");
  if (password && password.trim().length < 8) errors.push("password must be at least 8 characters");
  if (!role?.trim()) errors.push("role is required");
  if (role && !allowedRoles.includes(role.trim().toUpperCase() as UserRole)) {
    errors.push(`role must be one of ${allowedRoles.join(", ")}`);
  }

  if (errors.length > 0) {
    response
      .status(400)
      .json(buildMockErrorResponse("AUTH_VALIDATION_ERROR", "Registration data is invalid", errors));
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = mockUsers.find((entry) => entry.email === normalizedEmail);

  if (existingUser) {
    response
      .status(409)
      .json(buildMockErrorResponse("AUTH_EMAIL_IN_USE", "A user with that email already exists"));
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    role: role.trim().toUpperCase() as UserRole,
    password: password.trim(),
  };

  mockUsers.push(user);
  const payload = buildPayload(user.id);

  response.status(201).json(buildMockSuccessResponse(payload, "User registered successfully"));
};

export const loginMockUser = async (request: Request, response: Response): Promise<void> => {
  const { email, password } = request.body as Record<string, string>;

  if (!email?.trim() || !password?.trim()) {
    response
      .status(400)
      .json(
        buildMockErrorResponse("AUTH_VALIDATION_ERROR", "Login data is invalid", [
          "email is required",
          "password is required",
        ]),
      );
    return;
  }

  const user = mockUsers.find(
    (entry) => entry.email === email.trim().toLowerCase() && entry.password === password.trim(),
  );

  if (!user) {
    response
      .status(401)
      .json(buildMockErrorResponse("AUTH_INVALID_CREDENTIALS", "Email or password is incorrect"));
    return;
  }

  response.status(200).json(buildMockSuccessResponse(buildPayload(user.id), "Login successful"));
};

export const refreshMockSession = async (request: Request, response: Response): Promise<void> => {
  const { refreshToken } = request.body as Record<string, string>;

  if (!refreshToken?.trim()) {
    response
      .status(400)
      .json(
        buildMockErrorResponse("AUTH_VALIDATION_ERROR", "Refresh token is invalid", [
          "refreshToken is required",
        ]),
      );
    return;
  }

  const session = refreshTokens.get(refreshToken.trim());

  if (!session || Date.now() >= new Date(session.expiresAt).getTime()) {
    response
      .status(401)
      .json(buildMockErrorResponse("AUTH_INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired"));
    return;
  }

  refreshTokens.delete(refreshToken.trim());
  response.status(200).json(buildMockSuccessResponse(buildPayload(session.userId), "Session refreshed"));
};

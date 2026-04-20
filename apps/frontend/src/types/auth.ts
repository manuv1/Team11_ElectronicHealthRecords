import { ApiErrorResponse, ApiSuccessResponse } from "../../../../packages/shared/src/types/api-response";
import {
  AuthPayload,
  AuthenticatedUser,
  LoginRequest,
  RegisterRequest,
  RoleAssignmentRequest,
  UserRole,
} from "../../../../packages/shared/src/types/auth";

export const userRoles = ["ADMIN", "DOCTOR", "NURSE", "STAFF"] as const;
export const registrationRoles = userRoles;

export type RegistrationRole = (typeof registrationRoles)[number];
export type { UserRole };
export type AuthUser = AuthenticatedUser;
export type AuthSession = AuthPayload["tokens"] & {
  user: AuthPayload["user"];
};
export type LoginPayload = LoginRequest;
export type RegistrationPayload = RegisterRequest;
export type RoleAssignmentPayload = RoleAssignmentRequest;
export type AuthSuccessResponse<T> = ApiSuccessResponse<T>;
export type AuthErrorResponse = ApiErrorResponse;

export interface RegistrationResult {
  message: string;
  user?: AuthUser;
  session?: AuthSession;
}

export const isRegistrationRole = (value: string): value is RegistrationRole =>
  registrationRoles.includes(value as RegistrationRole);

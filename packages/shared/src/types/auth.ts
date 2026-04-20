export type UserRole = "ADMIN" | "DOCTOR" | "NURSE" | "STAFF";

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthPayload {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export interface RoleAssignmentRequest {
  role: UserRole;
}


import crypto from "crypto";

import { AuthPayload, LoginRequest, RegisterRequest } from "../types/auth";
import { createSignedToken, verifySignedToken } from "../utils/token";
import { authStore } from "./auth-store";
import { recordAuditEntry } from "./audit-service";
import { hashPassword, verifyPassword } from "../utils/password";

export class AuthServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

const accessTokenDurationMinutes = 15;
const refreshTokenDurationMinutes = 60 * 24 * 7;

interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildAuditMetadata = (
  context: AuthRequestContext,
  metadata: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ...metadata,
  ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
  ...(context.userAgent ? { userAgent: context.userAgent } : {}),
});

const buildAuthPayload = async (userId: string): Promise<AuthPayload> => {
  const userRecord = await authStore.findUserById(userId);

  if (!userRecord || !userRecord.isActive) {
    throw new AuthServiceError(401, "AUTH_USER_NOT_FOUND", "Authenticated user no longer exists");
  }

  const accessToken = createSignedToken(
    {
      sub: userRecord.id,
      type: "access",
      email: userRecord.email,
      role: userRecord.role,
    },
    accessTokenDurationMinutes,
  );
  const refreshToken = createSignedToken(
    {
      sub: userRecord.id,
      type: "refresh",
      email: userRecord.email,
      role: userRecord.role,
    },
    refreshTokenDurationMinutes,
  );

  await authStore.saveRefreshToken(hashRefreshToken(refreshToken.token), userRecord.id, refreshToken.expiresAt);

  return {
    user: {
      id: userRecord.id,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      email: userRecord.email,
      role: userRecord.role,
    },
    tokens: {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    },
  };
};

export const authService = {
  async register(input: RegisterRequest, context: AuthRequestContext = {}): Promise<AuthPayload> {
    const existingUser = await authStore.findUserByEmail(input.email);

    if (existingUser) {
      await recordAuditEntry({
        action: "auth.register",
        resource: "user",
        outcome: "failure",
        metadata: buildAuditMetadata(context, {
          email: input.email,
          reason: "duplicate-email",
        }),
      });
      throw new AuthServiceError(409, "AUTH_EMAIL_IN_USE", "A user with that email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authStore.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: input.role,
      passwordHash,
    });

    await recordAuditEntry({
      userId: user.id,
      action: "auth.register",
      resource: "user",
      outcome: "success",
      metadata: buildAuditMetadata(context, {
        role: user.role,
        email: user.email,
      }),
    });

    return buildAuthPayload(user.id);
  },

  async login(input: LoginRequest, context: AuthRequestContext = {}): Promise<AuthPayload> {
    const user = await authStore.findUserByEmail(input.email);

    if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
      await recordAuditEntry({
        action: "auth.login",
        resource: "user",
        outcome: "failure",
        metadata: buildAuditMetadata(context, {
          email: input.email,
        }),
      });
      throw new AuthServiceError(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    await authStore.touchUserLogin(user.id);

    await recordAuditEntry({
      userId: user.id,
      action: "auth.login",
      resource: "session",
      outcome: "success",
      metadata: buildAuditMetadata(context, {
        role: user.role,
        email: user.email,
      }),
    });

    return buildAuthPayload(user.id);
  },

  async refresh(refreshToken: string, context: AuthRequestContext = {}): Promise<AuthPayload> {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const persistedToken = await authStore.findRefreshToken(refreshTokenHash);
    const verifiedToken = verifySignedToken<{
      sub: string;
      type: "refresh";
      email: string;
      role: string;
    }>(refreshToken);

    if (!persistedToken || !verifiedToken || verifiedToken.type !== "refresh") {
      await recordAuditEntry({
        action: "auth.refresh",
        resource: "session",
        outcome: "failure",
        metadata: buildAuditMetadata(context),
      });
      throw new AuthServiceError(401, "AUTH_INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    await authStore.revokeRefreshToken(refreshTokenHash);
    await recordAuditEntry({
      userId: verifiedToken.sub,
      action: "auth.refresh",
      resource: "session",
      outcome: "success",
      metadata: buildAuditMetadata(context, {
        email: verifiedToken.email,
        role: verifiedToken.role,
      }),
    });

    return buildAuthPayload(verifiedToken.sub);
  },
};

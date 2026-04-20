import crypto from "crypto";

import { mockAuthUsers } from "../../../../packages/shared/src/mocks/users";
import { AuthenticatedUser, UserRole } from "../types/auth";
import { hashPassword } from "../utils/password";

export interface UserRecord extends AuthenticatedUser {
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const userRecords = new Map<string, UserRecord>();
const usersByEmail = new Map<string, UserRecord>();
const refreshTokens = new Map<string, RefreshTokenRecord>();

const toUser = (record: UserRecord): AuthenticatedUser => ({
  id: record.id,
  firstName: record.firstName,
  lastName: record.lastName,
  email: record.email,
  role: record.role,
});

const ensureSeededUsers = async (): Promise<void> => {
  if (userRecords.size > 0) {
    return;
  }

  const seeded = await Promise.all(
    mockAuthUsers.map(async (user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.toLowerCase(),
      role: user.role,
      passwordHash: await hashPassword(user.password),
      isActive: true,
      createdAt: new Date().toISOString(),
    })),
  );

  seeded.forEach((record) => {
    userRecords.set(record.id, record);
    usersByEmail.set(record.email, record);
  });
};

export const authStore = {
  async listUsers(): Promise<AuthenticatedUser[]> {
    await ensureSeededUsers();
    return Array.from(userRecords.values()).map(toUser);
  },

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    await ensureSeededUsers();
    return usersByEmail.get(email.toLowerCase()) ?? null;
  },

  async findUserById(userId: string): Promise<UserRecord | null> {
    await ensureSeededUsers();
    return userRecords.get(userId) ?? null;
  },

  async createUser(input: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    passwordHash: string;
  }): Promise<UserRecord> {
    await ensureSeededUsers();
    const record: UserRecord = {
      id: crypto.randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: input.passwordHash,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    userRecords.set(record.id, record);
    usersByEmail.set(record.email, record);

    return record;
  },

  async touchUserLogin(userId: string): Promise<void> {
    await ensureSeededUsers();
    const user = userRecords.get(userId);

    if (!user) {
      return;
    }

    const updatedUser: UserRecord = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    userRecords.set(userId, updatedUser);
    usersByEmail.set(updatedUser.email, updatedUser);
  },

  async saveRefreshToken(tokenHash: string, userId: string, expiresAt: string): Promise<void> {
    const timestamp = new Date().toISOString();
    refreshTokens.set(tokenHash, {
      tokenHash,
      userId,
      expiresAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const refreshToken = refreshTokens.get(tokenHash);

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.revokedAt || Date.now() >= new Date(refreshToken.expiresAt).getTime()) {
      refreshTokens.delete(tokenHash);
      return null;
    }

    return refreshToken;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const refreshToken = refreshTokens.get(tokenHash);

    if (!refreshToken) {
      return;
    }

    refreshTokens.set(tokenHash, {
      ...refreshToken,
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
};

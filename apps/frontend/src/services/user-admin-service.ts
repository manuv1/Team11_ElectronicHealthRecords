import { ApiErrorResponse, ApiSuccessResponse } from "../../../../packages/shared/src/types/api-response";
import {
  AuthUser,
  RoleAssignmentPayload,
  UserRole,
  isRegistrationRole,
} from "../types/auth";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const usersBaseUrl = `${resolveApiBaseUrl()}/auth/users`;

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as ApiErrorResponse | { message?: string; error?: string };

    if ("success" in payload && payload.success === false) {
      return payload.error.message ?? `Request failed with status ${response.status}.`;
    }

    if ("message" in payload && payload.message) {
      return payload.message;
    }

    if ("error" in payload && typeof payload.error === "string") {
      return payload.error;
    }

    return `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
};

const unwrapSuccessPayload = <T>(payload: T | ApiSuccessResponse<T>): T => {
  const record = getRecord(payload);

  if (record && "success" in record) {
    return (payload as ApiSuccessResponse<T>).data;
  }

  return payload as T;
};

const normalizeUser = (value: unknown): AuthUser => {
  const record = getRecord(value) ?? {};
  const role = String(record.role ?? "STAFF").toUpperCase();

  return {
    id: String(record.id ?? record.userId ?? record.email ?? ""),
    firstName: String(record.firstName ?? record.givenName ?? "Care"),
    lastName: String(record.lastName ?? record.familyName ?? "Team"),
    email: String(record.email ?? ""),
    role: isRegistrationRole(role) ? role : "STAFF",
  };
};

const requestJson = async <TResponse>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<TResponse> => {
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
};

export const userAdminService = {
  async list(accessToken: string): Promise<AuthUser[]> {
    const payload = await requestJson<unknown>(usersBaseUrl, accessToken);
    const data = unwrapSuccessPayload(payload);
    const record = getRecord(data);
    const rawUsers =
      (Array.isArray(data) && data) ||
      (Array.isArray(record?.users) && record.users) ||
      (Array.isArray(record?.items) && record.items) ||
      [];

    return rawUsers.map(normalizeUser);
  },

  async assignRole(
    userId: string,
    payload: RoleAssignmentPayload,
    accessToken: string,
  ): Promise<AuthUser> {
    const response = await requestJson<unknown>(
      `${usersBaseUrl}/${encodeURIComponent(userId)}/role`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    const data = unwrapSuccessPayload(response);
    const record = getRecord(data);

    return normalizeUser(record?.user ?? data);
  },
};

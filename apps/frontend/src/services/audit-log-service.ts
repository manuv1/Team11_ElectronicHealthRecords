import { ApiErrorResponse, ApiSuccessResponse } from "../../../../packages/shared/src/types/api-response";
import { AuthSession } from "../types/auth";
import { AuditLog, AuditLogListQuery, AuditOutcome } from "../types/audit-log";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

interface AuditLogListResult {
  auditLogs: AuditLog[];
  total: number;
  totalPages: number;
}

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const auditLogsBaseUrl = `${resolveApiBaseUrl()}/audit-logs`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
  if (isRecord(payload) && "success" in payload) {
    return (payload as unknown as ApiSuccessResponse<T>).data;
  }

  return payload as T;
};

const normalizeOutcome = (value: unknown): AuditOutcome =>
  value === "failure" ? "failure" : "success";

const normalizeAuditLog = (value: unknown): AuditLog => {
  const record = isRecord(value) ? value : {};
  const metadata = isRecord(record.metadata) ? record.metadata : undefined;

  return {
    id: String(record.id ?? ""),
    userId: typeof record.userId === "string" ? record.userId : undefined,
    action: String(record.action ?? "unknown.action"),
    resource: String(record.resource ?? "unknown"),
    outcome: normalizeOutcome(record.outcome),
    metadata,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : new Date().toISOString(),
  };
};

const buildQueryString = (query: AuditLogListQuery): string => {
  const params = new URLSearchParams();

  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.action) params.set("action", query.action);
  if (query.resource) params.set("resource", query.resource);
  if (query.outcome && query.outcome !== "ALL") params.set("outcome", query.outcome);
  if (query.userId) params.set("userId", query.userId);

  return params.toString();
};

const requestJson = async <TResponse>(url: string, session: AuthSession): Promise<TResponse> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "X-User-Role": session.user.role,
      "X-User-Id": session.user.id,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
};

export const auditLogService = {
  async list(query: AuditLogListQuery, session: AuthSession): Promise<AuditLogListResult> {
    const response = await requestJson<unknown>(`${auditLogsBaseUrl}?${buildQueryString(query)}`, session);
    const data = unwrapSuccessPayload(response as ApiSuccessResponse<unknown>);
    const record = isRecord(response) ? response : {};
    const pagination = isRecord(record.pagination) ? record.pagination : {};
    const rawLogs = Array.isArray(data) ? data : [];

    return {
      auditLogs: rawLogs.map(normalizeAuditLog),
      total: Number(pagination.total ?? rawLogs.length),
      totalPages: Number(pagination.totalPages ?? 1),
    };
  },
};

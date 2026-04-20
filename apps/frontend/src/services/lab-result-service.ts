import {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../../../../packages/shared/src/types/api-response";
import { AuthSession } from "../types/auth";
import {
  CreateLabOrderRequest,
  LabResult,
  LabResultFilters,
  LabResultListResult,
  LabResultStatus,
  UpdateLabResultRequest,
  labResultStatuses,
} from "../types/lab-result";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const apiBaseUrl = resolveApiBaseUrl();

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

const isLabResultStatus = (value: string): value is LabResultStatus =>
  labResultStatuses.includes(value as LabResultStatus);

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
  if (getRecord(payload) && "success" in (payload as Record<string, unknown>)) {
    return (payload as ApiSuccessResponse<T>).data;
  }

  return payload as T;
};

const getPagination = (payload: unknown): PaginationMeta | undefined => {
  const record = getRecord(payload);
  const pagination = getRecord(record?.pagination);

  if (!pagination) {
    return undefined;
  }

  return {
    page: Number(pagination.page ?? 1),
    limit: Number(pagination.limit ?? 0),
    total: Number(pagination.total ?? 0),
    totalPages:
      pagination.totalPages === undefined ? undefined : Number(pagination.totalPages),
  };
};

const normalizeLabResult = (value: unknown): LabResult => {
  const record = getRecord(value) ?? {};
  const rawStatus = String(record.status ?? "PENDING").toUpperCase();

  return {
    id: String(record.id ?? crypto.randomUUID()),
    patientId: String(record.patientId ?? ""),
    patientName: typeof record.patientName === "string" ? record.patientName : undefined,
    testName: String(record.testName ?? ""),
    testCode: String(record.testCode ?? ""),
    result: typeof record.result === "string" ? record.result : undefined,
    unit: typeof record.unit === "string" ? record.unit : undefined,
    normalRange: typeof record.normalRange === "string" ? record.normalRange : undefined,
    isAbnormal: typeof record.isAbnormal === "boolean" ? record.isAbnormal : undefined,
    status: isLabResultStatus(rawStatus) ? rawStatus : "PENDING",
    orderedBy: String(record.orderedBy ?? ""),
    orderedByName: typeof record.orderedByName === "string" ? record.orderedByName : undefined,
    orderedAt: String(record.orderedAt ?? ""),
    resultedAt: typeof record.resultedAt === "string" ? record.resultedAt : undefined,
    notes: typeof record.notes === "string" ? record.notes : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
};

const requestJson = async <TResponse>(
  url: string,
  session: AuthSession,
  init: RequestInit = {},
): Promise<TResponse | undefined> => {
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${session.accessToken}`);
  headers.set("X-User-Role", session.user.role);
  headers.set("X-User-Id", session.user.id);

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined;
  }

  return (await response.json()) as TResponse;
};

const buildListUrl = (patientId: string, filters: LabResultFilters): string => {
  const params = new URLSearchParams();

  if (filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  if (filters.abnormal !== "ALL") {
    params.set("abnormal", filters.abnormal);
  }

  params.set("page", "1");
  params.set("limit", "100");

  return `${apiBaseUrl}/patients/${encodeURIComponent(patientId)}/labs?${params.toString()}`;
};

const normalizeLabResultList = (payload: unknown): LabResultListResult => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);
  const rawLabResults =
    (Array.isArray(data) && data) ||
    (Array.isArray(record?.labResults) && record.labResults) ||
    (Array.isArray(record?.labs) && record.labs) ||
    (Array.isArray(record?.items) && record.items) ||
    (Array.isArray(record?.results) && record.results) ||
    [];

  return {
    labResults: rawLabResults.map(normalizeLabResult),
    pagination: getPagination(payload) ?? getPagination(data),
  };
};

const normalizeLabResultResponse = (payload: unknown): LabResult => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);

  return normalizeLabResult(record?.labResult ?? record?.lab ?? data);
};

export const labResultService = {
  async list(
    patientId: string,
    filters: LabResultFilters,
    session: AuthSession,
  ): Promise<LabResultListResult> {
    const payload = await requestJson<unknown>(buildListUrl(patientId, filters), session);

    return normalizeLabResultList(payload);
  },

  async create(
    patientId: string,
    payload: CreateLabOrderRequest,
    session: AuthSession,
  ): Promise<LabResult> {
    const response = await requestJson<unknown>(
      `${apiBaseUrl}/patients/${encodeURIComponent(patientId)}/labs`,
      session,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return normalizeLabResultResponse(response);
  },

  async update(
    labResultId: string,
    payload: UpdateLabResultRequest,
    session: AuthSession,
  ): Promise<LabResult> {
    const response = await requestJson<unknown>(
      `${apiBaseUrl}/labs/${encodeURIComponent(labResultId)}`,
      session,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    return normalizeLabResultResponse(response);
  },
};

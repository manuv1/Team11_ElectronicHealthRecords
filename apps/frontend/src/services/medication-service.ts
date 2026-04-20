import {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../../../../packages/shared/src/types/api-response";
import { AuthSession } from "../types/auth";
import {
  CreateMedicationRequest,
  Medication,
  MedicationFilters,
  MedicationListResult,
  MedicationStatus,
  UpdateMedicationRequest,
  medicationStatuses,
} from "../types/medication";

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

const isMedicationStatus = (value: string): value is MedicationStatus =>
  medicationStatuses.includes(value as MedicationStatus);

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

const normalizeMedication = (value: unknown): Medication => {
  const record = getRecord(value) ?? {};
  const rawStatus = String(record.status ?? "ACTIVE").toUpperCase();
  const allergyWarnings = Array.isArray(record.allergyWarnings)
    ? record.allergyWarnings.map((entry) => String(entry)).filter(Boolean)
    : [];

  return {
    id: String(record.id ?? crypto.randomUUID()),
    patientId: String(record.patientId ?? ""),
    patientName: typeof record.patientName === "string" ? record.patientName : undefined,
    name: String(record.name ?? ""),
    dosage: String(record.dosage ?? ""),
    frequency: String(record.frequency ?? ""),
    route: String(record.route ?? ""),
    prescribedBy: String(record.prescribedBy ?? ""),
    prescribedByName: typeof record.prescribedByName === "string" ? record.prescribedByName : undefined,
    startDate: String(record.startDate ?? ""),
    endDate: typeof record.endDate === "string" ? record.endDate : undefined,
    status: isMedicationStatus(rawStatus) ? rawStatus : "ACTIVE",
    notes: typeof record.notes === "string" ? record.notes : undefined,
    allergyWarnings,
    discontinueReason:
      typeof record.discontinueReason === "string" ? record.discontinueReason : undefined,
    discontinuedAt: typeof record.discontinuedAt === "string" ? record.discontinuedAt : undefined,
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

const buildListUrl = (patientId: string, filters: MedicationFilters): string => {
  const params = new URLSearchParams();

  if (filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  params.set("page", "1");
  params.set("limit", "100");

  return `${apiBaseUrl}/patients/${encodeURIComponent(patientId)}/medications?${params.toString()}`;
};

const normalizeMedicationList = (payload: unknown): MedicationListResult => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);
  const rawMedications =
    (Array.isArray(data) && data) ||
    (Array.isArray(record?.medications) && record.medications) ||
    (Array.isArray(record?.items) && record.items) ||
    [];

  return {
    medications: rawMedications.map(normalizeMedication),
    pagination: getPagination(payload) ?? getPagination(data),
  };
};

const normalizeMedicationResponse = (payload: unknown): Medication => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);

  return normalizeMedication(record?.medication ?? data);
};

export const medicationService = {
  async list(
    patientId: string,
    filters: MedicationFilters,
    session: AuthSession,
  ): Promise<MedicationListResult> {
    const payload = await requestJson<unknown>(buildListUrl(patientId, filters), session);

    return normalizeMedicationList(payload);
  },

  async create(
    patientId: string,
    payload: CreateMedicationRequest,
    session: AuthSession,
  ): Promise<Medication> {
    const response = await requestJson<unknown>(
      `${apiBaseUrl}/patients/${encodeURIComponent(patientId)}/medications`,
      session,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return normalizeMedicationResponse(response);
  },

  async update(
    medicationId: string,
    payload: UpdateMedicationRequest,
    session: AuthSession,
  ): Promise<Medication> {
    const response = await requestJson<unknown>(
      `${apiBaseUrl}/medications/${encodeURIComponent(medicationId)}`,
      session,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    return normalizeMedicationResponse(response);
  },
};

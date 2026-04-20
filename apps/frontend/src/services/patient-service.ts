import {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../../../../packages/shared/src/types/api-response";
import { AuthSession } from "../types/auth";
import {
  CreatePatientRequest,
  Patient,
  PatientFilters,
  PatientListResult,
  BloodType,
  UpdatePatientRequest,
  bloodTypes,
  patientGenders,
} from "../types/patient";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const patientsBaseUrl = `${resolveApiBaseUrl()}/patients`;

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

const normalizePatient = (value: unknown): Patient => {
  const record = getRecord(value) ?? {};
  const rawGender = String(record.gender ?? "OTHER").toUpperCase();
  const rawBloodType = String(record.bloodType ?? "").toUpperCase();
  const allergies = Array.isArray(record.allergies)
    ? record.allergies.map((entry) => String(entry)).filter(Boolean)
    : [];

  return {
    id: String(record.id ?? ""),
    mrn: String(record.mrn ?? ""),
    firstName: String(record.firstName ?? ""),
    lastName: String(record.lastName ?? ""),
    dateOfBirth: String(record.dateOfBirth ?? ""),
    gender: patientGenders.includes(rawGender as Patient["gender"])
      ? (rawGender as Patient["gender"])
      : "OTHER",
    email: typeof record.email === "string" ? record.email : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
    address: typeof record.address === "string" ? record.address : undefined,
    bloodType: bloodTypes.includes(rawBloodType as BloodType)
      ? (rawBloodType as BloodType)
      : undefined,
    allergies,
    isActive: Boolean(record.isActive ?? true),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    deletedAt: typeof record.deletedAt === "string" ? record.deletedAt : undefined,
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

const buildListUrl = (filters: PatientFilters): string => {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  return `${patientsBaseUrl}?${params.toString()}`;
};

const normalizePatientList = (payload: unknown): PatientListResult => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);
  const rawPatients =
    (Array.isArray(data) && data) ||
    (Array.isArray(record?.patients) && record.patients) ||
    (Array.isArray(record?.items) && record.items) ||
    [];

  return {
    patients: rawPatients.map(normalizePatient),
    pagination: getPagination(payload) ?? getPagination(data),
  };
};

const normalizePatientResponse = (payload: unknown): Patient => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);

  return normalizePatient(record?.patient ?? data);
};

export const patientService = {
  async list(filters: PatientFilters, session: AuthSession): Promise<PatientListResult> {
    const payload = await requestJson<unknown>(buildListUrl(filters), session);

    return normalizePatientList(payload);
  },

  async get(patientId: string, session: AuthSession): Promise<Patient> {
    const payload = await requestJson<unknown>(
      `${patientsBaseUrl}/${encodeURIComponent(patientId)}`,
      session,
    );

    return normalizePatientResponse(payload);
  },

  async create(payload: CreatePatientRequest, session: AuthSession): Promise<Patient> {
    const response = await requestJson<unknown>(patientsBaseUrl, session, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizePatientResponse(response);
  },

  async update(patientId: string, payload: UpdatePatientRequest, session: AuthSession): Promise<Patient> {
    const response = await requestJson<unknown>(
      `${patientsBaseUrl}/${encodeURIComponent(patientId)}`,
      session,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    return normalizePatientResponse(response);
  },

  async deactivate(patientId: string, session: AuthSession): Promise<Patient> {
    const response = await requestJson<unknown>(
      `${patientsBaseUrl}/${encodeURIComponent(patientId)}`,
      session,
      { method: "DELETE" },
    );

    return normalizePatientResponse(response);
  },
};

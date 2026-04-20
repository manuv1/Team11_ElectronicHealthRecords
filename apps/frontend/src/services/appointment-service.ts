import {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../../../../packages/shared/src/types/api-response";
import {
  Appointment,
  AppointmentBookingPayload,
  AppointmentFilters,
  AppointmentListResult,
  AppointmentStatus,
  AppointmentStatusUpdatePayload,
  AppointmentType,
  appointmentStatuses,
  appointmentTypes,
} from "../types/appointment";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const appointmentsBaseUrl = `${resolveApiBaseUrl()}/appointments`;

const isAppointmentType = (value: string): value is AppointmentType =>
  appointmentTypes.includes(value as AppointmentType);

const isAppointmentStatus = (value: string): value is AppointmentStatus =>
  appointmentStatuses.includes(value as AppointmentStatus);

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

const getDisplayName = (value: unknown): string | undefined => {
  const record = getRecord(value);

  if (!record) {
    return undefined;
  }

  if (typeof record.name === "string") {
    return record.name;
  }

  const firstName = typeof record.firstName === "string" ? record.firstName : "";
  const lastName = typeof record.lastName === "string" ? record.lastName : "";
  const combinedName = `${firstName} ${lastName}`.trim();

  return combinedName || undefined;
};

const normalizeAppointment = (value: unknown): Appointment => {
  const record = getRecord(value) ?? {};
  const rawType = String(record.type ?? "CHECKUP").toUpperCase();
  const rawStatus = String(record.status ?? "SCHEDULED").toUpperCase();
  const patient = getRecord(record.patient);
  const provider = getRecord(record.provider);
  const duration = Number(record.duration ?? 30);

  return {
    id: String(record.id ?? record.appointmentId ?? crypto.randomUUID()),
    patientId: String(record.patientId ?? patient?.id ?? ""),
    providerId: String(record.providerId ?? provider?.id ?? ""),
    dateTime: String(record.dateTime ?? record.scheduledAt ?? record.startTime ?? ""),
    duration: Number.isFinite(duration) ? duration : 30,
    type: isAppointmentType(rawType) ? rawType : "CHECKUP",
    status: isAppointmentStatus(rawStatus) ? rawStatus : "SCHEDULED",
    notes: typeof record.notes === "string" ? record.notes : undefined,
    patientName:
      typeof record.patientName === "string" ? record.patientName : getDisplayName(record.patient),
    providerName:
      typeof record.providerName === "string" ? record.providerName : getDisplayName(record.provider),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    cancelledAt: typeof record.cancelledAt === "string" ? record.cancelledAt : undefined,
  };
};

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
    const response = payload as ApiSuccessResponse<T>;

    return response.data;
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
  };
};

const requestJson = async <TResponse>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<TResponse | undefined> => {
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

  if (response.status === 204) {
    return undefined;
  }

  return (await response.json()) as TResponse;
};

const buildListUrl = (filters: AppointmentFilters): string => {
  const params = new URLSearchParams();

  if (filters.patientId.trim()) {
    params.set("patientId", filters.patientId.trim());
  }

  if (filters.providerId.trim()) {
    params.set("providerId", filters.providerId.trim());
  }

  if (filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  const query = params.toString();

  return query ? `${appointmentsBaseUrl}?${query}` : appointmentsBaseUrl;
};

const normalizeAppointmentList = (payload: unknown): AppointmentListResult => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);
  const rawAppointments =
    (Array.isArray(data) && data) ||
    (Array.isArray(record?.appointments) && record.appointments) ||
    (Array.isArray(record?.items) && record.items) ||
    (Array.isArray(record?.results) && record.results) ||
    [];

  return {
    appointments: rawAppointments.map(normalizeAppointment),
    pagination: getPagination(payload) ?? getPagination(data),
  };
};

const normalizeAppointmentResponse = (payload: unknown): Appointment => {
  const data = unwrapSuccessPayload(payload);
  const record = getRecord(data);
  const nestedAppointment = record?.appointment;

  return normalizeAppointment(nestedAppointment ?? data);
};

export const appointmentService = {
  async list(filters: AppointmentFilters, accessToken: string): Promise<AppointmentListResult> {
    const payload = await requestJson<unknown>(buildListUrl(filters), accessToken);

    return normalizeAppointmentList(payload);
  },

  async create(payload: AppointmentBookingPayload, accessToken: string): Promise<Appointment> {
    const response = await requestJson<unknown>(appointmentsBaseUrl, accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeAppointmentResponse(response);
  },

  async updateStatus(
    appointmentId: string,
    payload: AppointmentStatusUpdatePayload,
    accessToken: string,
  ): Promise<Appointment> {
    const response = await requestJson<unknown>(
      `${appointmentsBaseUrl}/${encodeURIComponent(appointmentId)}`,
      accessToken,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    return normalizeAppointmentResponse(response);
  },

  async cancel(appointmentId: string, accessToken: string): Promise<Appointment | undefined> {
    const response = await requestJson<unknown>(
      `${appointmentsBaseUrl}/${encodeURIComponent(appointmentId)}`,
      accessToken,
      {
        method: "DELETE",
      },
    );

    return response ? normalizeAppointmentResponse(response) : undefined;
  },
};

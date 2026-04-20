import { ApiErrorResponse, ApiSuccessResponse } from "../../../../packages/shared/src/types/api-response";
import { AuthSession } from "../types/auth";
import { OperationalReport } from "../types/report";

const fallbackApiBaseUrl = "http://localhost:4100/api/v1";

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : fallbackApiBaseUrl;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const reportsBaseUrl = `${resolveApiBaseUrl()}/reports`;

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

const requestJson = async <TResponse>(
  url: string,
  session: AuthSession,
): Promise<TResponse> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "X-User-Role": session.user.role,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
};

export const reportService = {
  async getOperational(session: AuthSession): Promise<OperationalReport> {
    const payload = await requestJson<unknown>(`${reportsBaseUrl}/operational`, session);

    return unwrapSuccessPayload<OperationalReport>(payload as ApiSuccessResponse<OperationalReport>);
  },
};

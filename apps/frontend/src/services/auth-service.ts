import {
  AuthErrorResponse,
  AuthSuccessResponse,
  AuthSession,
  AuthUser,
  LoginPayload,
  RegistrationPayload,
  RegistrationResult,
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

const authBaseUrl = `${resolveApiBaseUrl()}/auth`;

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as
      | AuthErrorResponse
      | { message?: string; error?: string };

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

const normalizeUser = (payload: Record<string, unknown>, fallbackEmail?: string): AuthUser => {
  const firstName = String(payload.firstName ?? payload.givenName ?? "Care");
  const lastName = String(payload.lastName ?? payload.familyName ?? "Team");
  const email = String(payload.email ?? fallbackEmail ?? "");
  const roleValue = String(payload.role ?? "STAFF").toUpperCase();

  return {
    id: String(payload.id ?? payload.userId ?? email ?? "user"),
    firstName,
    lastName,
    email,
    role: isRegistrationRole(roleValue) ? roleValue : "STAFF",
  };
};

const normalizeSession = (
  payload: Record<string, unknown>,
  credentials?: Partial<LoginPayload & RegistrationPayload>,
): AuthSession => {
  const nestedUser = payload.user && typeof payload.user === "object"
    ? (payload.user as Record<string, unknown>)
    : payload;
  const nestedTokens = payload.tokens && typeof payload.tokens === "object"
    ? (payload.tokens as Record<string, unknown>)
    : payload;
  const accessToken = String(
    nestedTokens.accessToken ?? payload.accessToken ?? payload.token ?? payload.jwt ?? "",
  );
  const refreshTokenValue = nestedTokens.refreshToken ?? payload.refreshToken;

  return {
    accessToken,
    refreshToken: typeof refreshTokenValue === "string" ? refreshTokenValue : "",
    accessTokenExpiresAt:
      typeof nestedTokens.accessTokenExpiresAt === "string"
        ? nestedTokens.accessTokenExpiresAt
        : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    refreshTokenExpiresAt:
      typeof nestedTokens.refreshTokenExpiresAt === "string"
        ? nestedTokens.refreshTokenExpiresAt
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user: normalizeUser(nestedUser, credentials?.email),
  };
};

const unwrapPayload = (payload: unknown): Record<string, unknown> => {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }

  return record;
};

const requestJson = async <TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> => {
  const response = await fetch(`${authBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
};

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = unwrapPayload(
      (await requestJson<AuthSuccessResponse<Record<string, unknown>>>("/login", payload)) ?? {},
    );
    const session = normalizeSession(response, payload);

    if (!session.accessToken) {
      throw new Error("Login succeeded but no access token was returned by the backend.");
    }

    return session;
  },

  async register(payload: RegistrationPayload): Promise<RegistrationResult> {
    const response = unwrapPayload(
      (await requestJson<AuthSuccessResponse<Record<string, unknown>>>("/register", payload)) ?? {},
    );
    const tokenSource =
      response.tokens && typeof response.tokens === "object"
        ? (response.tokens as Record<string, unknown>)
        : response;
    const hasSession = Boolean(
      tokenSource.accessToken ?? response.accessToken ?? response.token ?? response.jwt,
    );

    return {
      message: String(response.message ?? "Registration completed successfully."),
      user:
        response.user && typeof response.user === "object"
          ? normalizeUser(response.user as Record<string, unknown>, payload.email)
          : normalizeUser(payload as unknown as Record<string, unknown>, payload.email),
      session: hasSession ? normalizeSession(response, payload) : undefined,
    };
  },
};

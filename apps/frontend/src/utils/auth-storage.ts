import { AuthSession } from "../types/auth";

const AUTH_STORAGE_KEY = "medrecord-auth-session";

const isUsableSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;

  if (
    typeof session.accessToken !== "string" ||
    typeof session.refreshToken !== "string" ||
    typeof session.accessTokenExpiresAt !== "string" ||
    !session.user ||
    typeof session.user !== "object"
  ) {
    return false;
  }

  return Date.now() < new Date(session.accessTokenExpiresAt).getTime();
};

export const readStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as unknown;

    if (!isUsableSession(parsedSession)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsedSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeStoredSession = (session: AuthSession): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

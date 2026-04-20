import crypto from "crypto";

import { getEnv } from "./runtime";

const encoder = new TextEncoder();

const toBase64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromBase64Url = (value: string): Buffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(`${normalized}${padding}`, "base64");
};

export interface TokenSubject {
  sub: string;
  type: "access" | "refresh";
}

export interface SignedToken<TPayload extends object> {
  token: string;
  expiresAt: string;
  payload: TPayload & TokenSubject & { iat: number; exp: number };
}

const getSecretForTokenType = (type: TokenSubject["type"]): string =>
  type === "refresh"
    ? getEnv("JWT_REFRESH_SECRET", getEnv("JWT_SECRET", "medrecord-dev-refresh-secret"))
    : getEnv("JWT_ACCESS_SECRET", getEnv("JWT_SECRET", "medrecord-dev-access-secret"));

const sign = (payload: TokenSubject & object): string => {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const secret = getSecretForTokenType(payload.type);
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", encoder.encode(secret))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
};

export const verifySignedToken = <TPayload extends TokenSubject>(
  token: string,
): (TPayload & { iat: number; exp: number }) | null => {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const unsafePayload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as TokenSubject;

  if (unsafePayload.type !== "access" && unsafePayload.type !== "refresh") {
    return null;
  }

  const secret = getSecretForTokenType(unsafePayload.type);
  const expectedSignature = crypto
    .createHmac("sha256", encoder.encode(secret))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const actualSignature = fromBase64Url(encodedSignature);

  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  const payload = unsafePayload as TPayload & { iat: number; exp: number };

  if (Date.now() >= payload.exp * 1000) {
    return null;
  }

  return payload;
};

export const createSignedToken = <TPayload extends object>(
  payload: TPayload & TokenSubject,
  expiresInMinutes: number,
): SignedToken<TPayload> => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresInMinutes * 60;
  const fullPayload = {
    ...payload,
    iat: issuedAt,
    exp: expiresAt,
  };

  return {
    token: sign(fullPayload),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    payload: fullPayload,
  };
};

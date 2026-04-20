import { NextFunction, Request, Response } from "express";

import { buildMockErrorResponse } from "../utils/response";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const parseAllowedOrigins = (): Set<string> => {
  const configured = process.env.CORS_ALLOWED_ORIGINS;
  const origins = configured
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
    : defaultAllowedOrigins;

  return new Set(origins);
};

const isLocalDevelopmentOrigin = (origin: string): boolean =>
  process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

export const applySecurityHeaders = (
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  response.header("Cache-Control", "no-store");
  response.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.header("Cross-Origin-Resource-Policy", "same-origin");
  response.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.header("Referrer-Policy", "no-referrer");
  response.header("X-Content-Type-Options", "nosniff");
  response.header("X-Frame-Options", "DENY");
  response.removeHeader("X-Powered-By");
  next();
};

export const applyCorsPolicy = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const origin = request.header("Origin");
  const allowedOrigins = parseAllowedOrigins();
  const isAllowedOrigin = !origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin(origin);

  response.header("Vary", "Origin");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role, X-User-Id");
  response.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.header("Access-Control-Max-Age", "600");

  if (origin && isAllowedOrigin) {
    response.header("Access-Control-Allow-Origin", origin);
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(isAllowedOrigin ? 204 : 403);
    return;
  }

  if (!isAllowedOrigin) {
    response
      .status(403)
      .json(buildMockErrorResponse("CORS_FORBIDDEN", "Origin is not allowed"));
    return;
  }

  next();
};

export const handleMalformedJson = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (error instanceof SyntaxError && "body" in error) {
    response
      .status(400)
      .json(buildMockErrorResponse("INVALID_JSON", "Request body must be valid JSON"));
    return;
  }

  next(error);
};

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const createRateLimiter = (
  options: { windowMs: number; maxRequests: number },
) => {
  const buckets = new Map<string, RateLimitBucket>();

  return (request: Request, response: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${request.ip}:${request.method}:${request.path}`;
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    response.header("RateLimit-Limit", String(options.maxRequests));
    response.header("RateLimit-Remaining", String(Math.max(options.maxRequests - bucket.count, 0)));
    response.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      response
        .status(429)
        .json(buildMockErrorResponse("RATE_LIMITED", "Too many requests. Please try again later."));
      return;
    }

    next();
  };
};

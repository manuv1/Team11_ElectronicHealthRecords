import type { Request, Response } from "express";

import { auditLogs } from "../data/audit-logs";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import type { AuditLog, AuditOutcome } from "../../../../packages/shared/src/types/audit-log.ts";

const allowedOutcomes: Array<AuditOutcome | "ALL"> = ["ALL", "success", "failure"];

const readString = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;

  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
};

const matchesQuery = (
  log: AuditLog,
  query: {
    search?: string;
    action?: string;
    resource?: string;
    outcome?: AuditOutcome | "ALL";
    userId?: string;
  },
): boolean => {
  const search = query.search?.toLowerCase();

  if (query.action && log.action !== query.action) return false;
  if (query.resource && log.resource !== query.resource) return false;
  if (query.outcome && query.outcome !== "ALL" && log.outcome !== query.outcome) return false;
  if (query.userId && log.userId !== query.userId) return false;

  if (!search) {
    return true;
  }

  return [
    log.userId,
    log.action,
    log.resource,
    log.outcome,
    log.createdAt,
    JSON.stringify(log.metadata ?? {}),
  ].some((value) => value?.toLowerCase().includes(search));
};

export const listMockAuditLogs = async (request: Request, response: Response): Promise<void> => {
  const role = String(request.header("x-user-role") ?? "ADMIN").toUpperCase();

  if (role !== "ADMIN") {
    response.status(403).json(buildMockErrorResponse("FORBIDDEN", "Only admins can view audit logs"));
    return;
  }

  const outcome = readString(request.query.outcome) as AuditOutcome | "ALL" | undefined;

  if (outcome && !allowedOutcomes.includes(outcome)) {
    response
      .status(400)
      .json(buildMockErrorResponse("VALIDATION_ERROR", "Audit log filters are invalid", [
        `outcome must be one of ${allowedOutcomes.join(", ")}`,
      ]));
    return;
  }

  const page = Math.max(Number(request.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(request.query.limit ?? 25), 1), 100);
  const filteredLogs = auditLogs
    .filter((log) =>
      matchesQuery(log, {
        search: readString(request.query.search),
        action: readString(request.query.action),
        resource: readString(request.query.resource),
        outcome: outcome ?? "ALL",
        userId: readString(request.query.userId),
      }),
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const startIndex = (page - 1) * limit;
  const items = filteredLogs.slice(startIndex, startIndex + limit);

  response.status(200).json(
    buildMockSuccessResponse(items, "Mock audit logs fetched", {
      page,
      limit,
      total: filteredLogs.length,
      totalPages: Math.ceil(filteredLogs.length / limit),
    }),
  );
};

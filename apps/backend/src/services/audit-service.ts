import crypto from "crypto";

import { AuditLog, AuditLogListQuery, AuditOutcome } from "../types/audit-log";

export interface AuditEntryInput {
  userId?: string;
  action: string;
  resource: string;
  outcome: AuditOutcome;
  metadata?: Record<string, unknown>;
}

const sensitiveMetadataKeys = new Set([
  "address",
  "allergies",
  "dateofbirth",
  "dob",
  "email",
  "firstname",
  "lastname",
  "mrn",
  "name",
  "notes",
  "password",
  "phone",
  "result",
  "token",
]);

const auditLogs: AuditLog[] = [];

const normalizeText = (value: string): string => value.trim().toLowerCase();

const sanitizeMetadata = (
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!metadata) {
    return undefined;
  }

  return Object.entries(metadata).reduce<Record<string, unknown>>((safeMetadata, [key, value]) => {
    if (sensitiveMetadataKeys.has(key.toLowerCase())) {
      safeMetadata[key] = "[redacted]";
      return safeMetadata;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      safeMetadata[key] = sanitizeMetadata(value as Record<string, unknown>);
      return safeMetadata;
    }

    safeMetadata[key] = value;
    return safeMetadata;
  }, {});
};

const matchesQuery = (log: AuditLog, query: AuditLogListQuery): boolean => {
  const search = query.search ? normalizeText(query.search) : undefined;

  if (query.action && log.action !== query.action) {
    return false;
  }

  if (query.resource && log.resource !== query.resource) {
    return false;
  }

  if (query.outcome && query.outcome !== "ALL" && log.outcome !== query.outcome) {
    return false;
  }

  if (query.userId && log.userId !== query.userId) {
    return false;
  }

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

export const recordAuditEntry = async (entry: AuditEntryInput): Promise<void> => {
  auditLogs.unshift({
    id: crypto.randomUUID(),
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    outcome: entry.outcome,
    metadata: sanitizeMetadata(entry.metadata),
    createdAt: new Date().toISOString(),
  });
};

export const auditService = {
  async list(query: AuditLogListQuery): Promise<{ items: AuditLog[]; total: number }> {
    const filteredLogs = auditLogs
      .filter((log) => matchesQuery(log, query))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const startIndex = (query.page - 1) * query.limit;

    return {
      items: filteredLogs.slice(startIndex, startIndex + query.limit),
      total: filteredLogs.length,
    };
  },
};

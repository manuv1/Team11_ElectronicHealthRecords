export type AuditOutcome = "success" | "failure";

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  outcome: AuditOutcome;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogListQuery {
  search?: string;
  action?: string;
  resource?: string;
  outcome?: AuditOutcome | "ALL";
  userId?: string;
  page: number;
  limit: number;
}

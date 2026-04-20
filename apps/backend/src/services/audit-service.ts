export interface AuditEntryInput {
  userId?: string;
  action: string;
  resource: string;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}

export const recordAuditEntry = async (_entry: AuditEntryInput): Promise<void> => {
  // Placeholder hook for future Prisma-backed audit persistence.
};

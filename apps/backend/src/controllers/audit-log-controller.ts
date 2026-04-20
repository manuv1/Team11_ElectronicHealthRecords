import { Request, Response } from "express";

import { auditService } from "../services/audit-service";
import { buildErrorResponse, buildSuccessResponse } from "../utils/response";
import { validateAuditLogListQuery } from "../validators/audit-log-validator";

export const listAuditLogs = async (request: Request, response: Response): Promise<void> => {
  const validation = validateAuditLogListQuery(request.query);

  if (!validation.success) {
    response
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "Audit log filters are invalid", validation.errors));
    return;
  }

  try {
    const result = await auditService.list(validation.data);

    response.status(200).json(
      buildSuccessResponse(result.items, "Audit logs fetched", {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / validation.data.limit),
      }),
    );
  } catch {
    response.status(500).json(buildErrorResponse("SERVER_ERROR", "Audit log request failed"));
  }
};

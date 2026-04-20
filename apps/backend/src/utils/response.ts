import { ApiErrorResponse, ApiSuccessResponse } from "../types/api-response";

export const buildSuccessResponse = <T>(
  data: T,
  message?: string,
  pagination?: ApiSuccessResponse<T>["pagination"],
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  message,
  pagination,
});

export const buildErrorResponse = (
  code: string,
  message: string,
  details: string[] = [],
): ApiErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});

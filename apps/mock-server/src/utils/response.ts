import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../../../../packages/shared/src/types/api-response.ts";

export const buildMockSuccessResponse = <T>(
  data: T,
  message?: string,
  pagination?: ApiSuccessResponse<T>["pagination"],
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  message,
  pagination,
});

export const buildMockErrorResponse = (
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

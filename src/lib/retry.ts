import { ApiError } from "@/api/errors";

interface RetryOptions { maxAttempts?: number; shouldRetry?: (error: ApiError) => boolean;
  fallbackDelay?: number;
}

export const withRetry = async <T>(
  request: () => Promise<T>,
  {
    maxAttempts = 3,
    shouldRetry = () => false,
    fallbackDelay = 2000,
  }: RetryOptions = {},
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      const canRetry =
        shouldRetry(error) && attempt < maxAttempts;

      if (!canRetry) {
        throw error;
      }

      const delay =
        error.retryAfter !== undefined
          ? error.retryAfter * 1000
          : fallbackDelay;

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw new Error("Retry failed");
};
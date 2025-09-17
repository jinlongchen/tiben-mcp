export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = () => true,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryableErrors(error)) {
        throw error;
      }

      console.error(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

export function isRetryableError(error: any): boolean {
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  if (error.status === 429 || error.status === 503 || error.status === 504) {
    return true;
  }
  
  if (error.message?.includes('rate limit') || error.message?.includes('timeout')) {
    return true;
  }
  
  return false;
}
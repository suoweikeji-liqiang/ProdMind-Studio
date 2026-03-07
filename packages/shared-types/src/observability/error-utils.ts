import type { NormalizedError, FailureContext } from './failure.js';
import type { CorrelationContext } from './events.js';

function generateErrorCode(source: string, operation: string): string {
  return `${source.toUpperCase()}_${operation.toUpperCase()}`;
}

export function createNormalizedError(
  correlation: CorrelationContext,
  source: string,
  operation: string,
  message: string,
  retryable: boolean,
  originalError?: unknown
): NormalizedError {
  const context: FailureContext = {
    runId: correlation.runId,
    phaseId: correlation.phaseId,
    stepId: correlation.stepId,
    source,
    operation,
    timestamp: new Date().toISOString(),
  };

  return {
    code: generateErrorCode(source, operation),
    message,
    retryable,
    context,
    originalError: originalError ? String(originalError) : undefined,
  };
}

export function isRetryableError(error: NormalizedError): boolean {
  return error.retryable;
}

export function formatErrorForUser(error: NormalizedError): string {
  return `[${error.code}] ${error.message}`;
}

export function formatErrorForDiagnostics(error: NormalizedError): string {
  const parts = [
    `Error: ${error.code}`,
    `Message: ${error.message}`,
    `Source: ${error.context.source}`,
    `Operation: ${error.context.operation}`,
    `Run ID: ${error.context.runId}`,
  ];

  if (error.context.phaseId) {
    parts.push(`Phase: ${error.context.phaseId}`);
  }

  if (error.context.stepId) {
    parts.push(`Step: ${error.context.stepId}`);
  }

  parts.push(`Retryable: ${error.retryable}`);
  parts.push(`Timestamp: ${error.context.timestamp}`);

  if (error.originalError) {
    parts.push(`Original: ${error.originalError}`);
  }

  return parts.join('\n');
}

import type { CorrelationContext, ProviderEvent } from '@prodmind/shared-types';
import { getGlobalEmitter } from '@prodmind/shared-types';

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function emitProviderStart(
  correlation: CorrelationContext,
  provider: string,
  model: string,
  method: 'streamText' | 'generateStructured'
): void {
  const event: ProviderEvent = {
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    severity: 'info',
    correlation,
    source: 'llm-adapter',
    type: 'provider',
    operation: 'request_start',
    provider,
    model,
    method,
  };
  getGlobalEmitter().emit(event);
}

export function emitProviderEnd(
  correlation: CorrelationContext,
  provider: string,
  model: string,
  method: 'streamText' | 'generateStructured',
  durationMs: number,
  tokenCount?: number
): void {
  const event: ProviderEvent = {
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    severity: 'info',
    correlation,
    source: 'llm-adapter',
    type: 'provider',
    operation: 'request_end',
    provider,
    model,
    method,
    durationMs,
    tokenCount,
  };
  getGlobalEmitter().emit(event);
}

export function emitProviderError(
  correlation: CorrelationContext,
  provider: string,
  model: string,
  method: 'streamText' | 'generateStructured',
  durationMs: number,
  errorType: string,
  retryable: boolean
): void {
  const event: ProviderEvent = {
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    severity: 'error',
    correlation,
    source: 'llm-adapter',
    type: 'provider',
    operation: 'request_error',
    provider,
    model,
    method,
    durationMs,
    errorType,
    retryable,
  };
  getGlobalEmitter().emit(event);
}

import { describe, it, expect } from 'vitest';
import {
  WorkflowEventSchema,
  ProviderEventSchema,
  PersistenceEventSchema,
  RecoveryEventSchema,
  ObservabilityEventSchema,
} from '../src/observability/events.js';

describe('Observability Contract', () => {
  it('validates workflow event', () => {
    const event = {
      eventId: 'evt_1',
      timestamp: new Date().toISOString(),
      severity: 'info',
      correlation: { runId: 'run_1' },
      source: 'workflow',
      type: 'workflow',
      operation: 'start',
    };
    expect(() => WorkflowEventSchema.parse(event)).not.toThrow();
  });

  it('validates provider event', () => {
    const event = {
      eventId: 'evt_2',
      timestamp: new Date().toISOString(),
      severity: 'info',
      correlation: { runId: 'run_1', phaseId: 'challenge' },
      source: 'llm-adapter',
      type: 'provider',
      operation: 'request_start',
      provider: 'openai',
      model: 'gpt-4',
    };
    expect(() => ProviderEventSchema.parse(event)).not.toThrow();
  });

  it('validates persistence event', () => {
    const event = {
      eventId: 'evt_3',
      timestamp: new Date().toISOString(),
      severity: 'info',
      correlation: { runId: 'run_1' },
      source: 'persistence',
      type: 'persistence',
      operation: 'write',
      backend: 'file',
      entity: 'run',
      success: true,
    };
    expect(() => PersistenceEventSchema.parse(event)).not.toThrow();
  });

  it('validates recovery event', () => {
    const event = {
      eventId: 'evt_4',
      timestamp: new Date().toISOString(),
      severity: 'warning',
      correlation: { runId: 'run_1', phaseId: 'challenge' },
      source: 'challenge-engine',
      type: 'recovery',
      operation: 'attempt',
      reason: 'Provider rate limit',
      attemptNumber: 1,
    };
    expect(() => RecoveryEventSchema.parse(event)).not.toThrow();
  });

  it('validates discriminated union', () => {
    const events = [
      { type: 'workflow', operation: 'start' },
      { type: 'provider', operation: 'request_start', provider: 'openai', model: 'gpt-4' },
      { type: 'persistence', operation: 'write', backend: 'file', entity: 'run', success: true },
      { type: 'recovery', operation: 'attempt', reason: 'test' },
    ].map(partial => ({
      eventId: 'evt',
      timestamp: new Date().toISOString(),
      severity: 'info' as const,
      correlation: { runId: 'run_1' },
      source: 'test',
      ...partial,
    }));

    events.forEach(event => {
      expect(() => ObservabilityEventSchema.parse(event)).not.toThrow();
    });
  });
});

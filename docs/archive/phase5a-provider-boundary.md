# Phase 5A: Provider Integration Boundary

## Overview

This document formalizes the provider integration boundary to enable controlled, extensible real provider integration without leaking provider-specific details into engines.

## Provider Contract

All providers (fake, OpenAI, Anthropic, future providers) implement the `LLMAdapter` interface:

```typescript
interface LLMAdapter {
  streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string>;
  generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T>;
  getMetadata(): ProviderMetadata;
}
```

## Provider Roles

### Fake Provider
- **Purpose**: Testing, CI, local development without API costs
- **Behavior**: Returns pre-configured responses
- **Use case**: All automated tests, golden path validation

### Real Providers (OpenAI, Anthropic)
- **Purpose**: Production usage, real LLM capabilities
- **Behavior**: Calls external APIs
- **Use case**: Opt-in smoke tests, production workflows

## Error Normalization

Providers normalize errors into standard categories:

```typescript
type ProviderError = {
  type: 'rate_limit' | 'auth' | 'network' | 'invalid_request' | 'model_error' | 'unknown';
  message: string;
  retryable: boolean;
  originalError?: unknown;
};
```

**Benefits:**
- Engines don't see provider-specific error formats
- Retry logic can be provider-agnostic
- Observability can track error types uniformly

## Capability Declaration

Providers declare their capabilities:

```typescript
type ProviderCapabilities = {
  streaming: boolean;
  structuredOutput: boolean;
  maxTokens?: number;
};
```

Engines can query capabilities before attempting operations.

## Provider-Specific Config

Provider configuration is isolated in `LLMConfig`:

```typescript
interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  modelId: string;
  baseURL?: string;
}
```

Engines receive only the `LLMAdapter` interface, never the config.

## CI vs Local Smoke Boundary

**CI (default):**
- Uses fake provider exclusively
- No external API calls
- Fast, deterministic, cost-free

**Local smoke (opt-in):**
- Uses real provider
- Requires API keys in environment
- Validates real integration
- User explicitly triggers

## Architecture

```
┌─────────────────────────────────────────┐
│         Engines (challenge, etc)        │
│  - Only see LLMAdapter interface        │
│  - No provider-specific knowledge       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         LLMAdapter (interface)          │
│  - streamText / generateStructured      │
│  - getMetadata                          │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ FakeProvider │    │ RealProvider │
│ (CI default) │    │ (opt-in)     │
└──────────────┘    └──────────────┘
```

## Non-Goals (Phase 5A)

- Provider marketplace
- Dynamic provider discovery
- Multi-provider routing
- Provider-specific optimizations in engines

These remain deferred until clear product need.

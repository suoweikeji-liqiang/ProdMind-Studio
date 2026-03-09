# Phase 5C Usage Surface

## Purpose

Phase 5C adds a minimal usage and cost surface so operators can see what a provider call consumed.

This is not a billing system.

## Recorded Fields

Each `ProviderExecutionSummary` carries:

- `selectedProvider`
- `selectedModel`
- `attempts`
- `retriesPerformed`
- `timeoutCount`
- `fallbackUsed`
- `usage.requestCount`
- `usage.inputTokens`
- `usage.outputTokens`
- `usage.totalTokens`
- `usage.actualCostUsd`
- `usage.estimatedCostUsd`

## Availability States

Token and cost values are marked explicitly:

- `available`: sourced directly from the provider response
- `estimated`: derived from configured rates and available token counts
- `unavailable`: not exposed reliably by the provider path

## Current Behavior

- Fake provider: deterministic estimated token visibility for local validation
- Real provider: token visibility depends on SDK/provider response
- Cost: estimated when rate inputs are configured, otherwise unavailable

## Surfaces

### CLI

Shows:

- provider/model
- retries
- timeout count
- fallback summary
- token visibility
- cost visibility

### Web

Shows:

- provider/model
- retries and timeout count
- fallback yes/no
- token visibility
- cost visibility

### Persistence

`WorkflowRun` and `WorkflowResult` may persist `providerExecutions` so history and result views read the same normalized summary.

## Explicit Non-Goals

- Invoices
- Account-level billing
- Per-user chargeback
- Budget alerts
- Historical spend analytics

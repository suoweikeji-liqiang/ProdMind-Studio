# Phase 5C Provider Capability Boundary

## Purpose

Phase 5C formalizes what a provider/model path can do, how reliability policy is applied, and what usage/cost surface can be trusted.

This is a provider maturity pass, not a provider platform pass.

## Capability vs Enablement

Capability is not enablement.

- Capability answers: can this provider/model path stream or produce structured output?
- Enablement answers: is this path currently configured, credentialed, and selected?

A provider can advertise `structuredOutput: true` while still being disabled for the current run.

## Contracts

Shared contracts now live in `packages/shared-types/src/provider/contracts.ts`.

### Required fields

- `providerName`
- `modelName`
- `capabilities.structuredOutput`
- `capabilities.streaming`
- `reliability.timeoutMs`
- `reliability.maxRetries`
- `reliability.fallbackEligible`
- `usage.tokenAccounting`
- `usage.costAccounting`

### Optional fields

- `reliability.fallbackProvider`
- `reliability.fallbackModel`
- `usage.pricePerMillionInputTokensUsd`
- `usage.pricePerMillionOutputTokensUsd`
- runtime timestamps inside `runtime`

### Runtime-derived fields

- `attempts`
- `retriesPerformed`
- `timeoutCount`
- `fallbackUsed`
- `selectedProvider`
- `selectedModel`
- `failureType`
- `failureMessage`
- normalized usage/cost summary

## Routing Boundary

Capability-aware selection stays inside `packages/llm-adapter`.

- Engines may declare required capabilities.
- Engines may not branch on provider type or provider error shape.
- Apps may configure fake vs real mode, but may not implement retry, timeout, fallback, or routing policy.

## Fallback Rule

Fallback is explicit only.

- No configured fallback: fail clearly on capability mismatch or provider failure.
- Configured fallback: adapter may attempt fallback for conservative categories such as capability mismatch or retry exhaustion.

## Out of Scope for 5C

- Provider marketplace
- Dynamic provider discovery
- Advanced provider scoring
- Budget enforcement
- Billing ledger
- Dashboard analytics

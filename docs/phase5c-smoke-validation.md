# Phase 5C Smoke Validation

## Purpose

The Phase 5C smoke workflow validates real-provider behavior more credibly than a single happy-path call while keeping CI independent from real providers.

## Base Validation

Command:

```bash
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs
```

or:

```bash
ANTHROPIC_API_KEY=sk-ant-xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
```

Base validation checks:

1. metadata and capability surface
2. `streamText`
3. `generateStructured`
4. usage/cost visibility in `ProviderExecutionSummary`

## Optional Policy Validation

Command:

```bash
OPENAI_API_KEY=sk-xxx SMOKE_VALIDATE_POLICY=1 node scripts/smoke-real-provider.mjs
```

This adds one intentionally aggressive timeout/retry validation.

Expected outcome:

- no fallback configured: `timeout` or `retry_exhausted`
- fallback configured: `fallbackUsed = true` or `failureType = fallback_failed`

## Fallback Validation

Fallback is only tested when you explicitly configure it:

```bash
OPENAI_API_KEY=sk-primary \
PROVIDER_FALLBACK_TYPE=anthropic \
ANTHROPIC_API_KEY=sk-fallback \
PROVIDER_FALLBACK_MODEL_ID=claude-3-5-haiku-20241022 \
SMOKE_VALIDATE_POLICY=1 \
node scripts/smoke-real-provider.mjs
```

## Cost Expectations

- Base validation: 2 real calls
- Optional policy validation: 1 additional forced-timeout call
- Fallback can add extra calls

Operators should treat all numbers as minimal smoke validation costs, not production budgeting data.

## CI Policy

- CI default: fake provider only
- Real-provider smoke: local opt-in only
- Real-provider smoke is informative, not a blocking CI dependency

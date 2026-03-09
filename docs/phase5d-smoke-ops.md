# Phase 5D Smoke Operations

## Status

Real-provider smoke remains opt-in, operator-run, and non-CI-blocking.

## Command

```bash
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs
```

Optional policy stress path:

```bash
OPENAI_API_KEY=sk-xxx SMOKE_VALIDATE_POLICY=1 node scripts/smoke-real-provider.mjs
```

Anthropic example:

```bash
ANTHROPIC_API_KEY=sk-ant-xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
```

## Validation Coverage

- metadata / capability surface
- streamText path
- structured output path
- usage/cost visibility
- retry / timeout behavior when policy validation is enabled
- fallback visibility when explicit fallback is configured

## Expected Output

Operators should expect:

- provider/model used
- route summary
- effective policy snapshot
- retries / timeouts
- fallback used or failure
- usage/cost visibility state

## Cost and Risk Notes

- Base validation performs two real calls.
- Policy validation performs one additional stress call.
- Explicit fallback can add extra calls.
- Usage/cost output is still minimal and not billing-grade.

## CI Boundary

- CI default remains fake provider only.
- Real-provider smoke is intentionally not a blocking default gate.

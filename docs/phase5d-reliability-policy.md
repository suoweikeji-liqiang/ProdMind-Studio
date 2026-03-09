# Phase 5D Reliability Policy

## Intent

Phase 5D tunes the Phase 5C reliability baseline toward conservative defaults.

## Defaults

- Timeout remains bounded per attempt.
- Retry remains bounded with a hard ceiling.
- Request overrides are clamped to policy maxima.
- Fallback remains explicit-only.

## Policy Model

The adapter now records:

- default timeout
- maximum timeout boundary
- default retry count
- retry ceiling
- fallback mode

The execution summary also records the effective policy snapshot actually used for a call.

## Retryable Classification

The normalized retryable classes remain conservative:

- timeout
- network
- rate limit

Non-retryable classes remain non-retryable:

- auth
- invalid request
- capability mismatch
- model error

## Fallback Policy

- Fallback is not automatic marketplace routing.
- Fallback is allowed only when explicitly configured.
- Fallback is attempted only for policy-eligible failures.
- Fallback is blocked when the candidate does not satisfy required capabilities.

## Operator Impact

CLI and Web now expose:

- route used
- retry count
- timeout count
- fallback used or not
- failure stage
- usage/cost summary

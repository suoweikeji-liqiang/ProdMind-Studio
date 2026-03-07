# Real Provider Smoke Testing

## Overview

This document describes the opt-in smoke testing workflow for validating real provider integration.

## Purpose

- Validate real provider integration works end-to-end
- Catch provider-specific issues before production
- Verify error handling with real APIs
- Test actual token usage and costs

## Usage

### OpenAI

```bash
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs
```

### Anthropic

```bash
ANTHROPIC_API_KEY=sk-ant-xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
```

## What It Tests

1. **streamText**: Validates streaming text generation
2. **generateStructured**: Validates structured output generation
3. **getMetadata**: Validates provider metadata

## CI vs Local

**CI (default):**
- Uses fake provider only
- No real API calls
- Fast, deterministic, free

**Local smoke (opt-in):**
- Requires explicit API key
- Makes real API calls
- Incurs costs (minimal, ~$0.01)
- User must explicitly run

## Cost Estimate

Approximate cost per smoke run:
- OpenAI (gpt-4o-mini): ~$0.001
- Anthropic (claude-3-5-haiku): ~$0.001

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `PROVIDER`: Provider to test (default: openai)

## Non-Goals

- Not a replacement for unit tests
- Not run automatically in CI
- Not a comprehensive integration test suite
- Not a performance benchmark

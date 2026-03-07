# Real Provider Smoke Testing

## Overview

Optional smoke test for validating real LLM provider integration without making CI dependent on external services.

## Strategy

**CI Default**: Fake provider only
**Local Opt-in**: Real provider smoke test

## Implementation

### Environment Variable Control

```bash
# Run with real provider (opt-in)
SMOKE_TEST_REAL_PROVIDER=1 npm run test:smoke

# Default: fake provider only
npm test
```

### Provider Configuration

Real provider requires:
- `ANTHROPIC_API_KEY` or equivalent
- Network connectivity
- Valid API quota

### Smoke Test Scope

Minimal validation:
1. Provider connection
2. Single challenge round
3. Response parsing
4. Basic error handling

**Not tested**:
- Full workflow execution
- Multi-round sessions
- Rate limiting
- Cost optimization

## Usage

### Local Development

```bash
# Set API key
export ANTHROPIC_API_KEY=your-key

# Run smoke test
SMOKE_TEST_REAL_PROVIDER=1 npm run test:smoke
```

### CI Configuration

```yaml
# CI runs fake provider only (default)
- run: npm test

# Optional: scheduled real provider validation
# (separate job, not blocking main CI)
```

## Contract Risks

**Known Risks**:
- Provider API changes
- Rate limiting
- Network failures
- Cost accumulation

**Mitigation**:
- Smoke test is opt-in only
- Single request per test run
- Clear documentation
- Separate from main test suite

## Deferred

- Comprehensive provider integration tests
- Multi-provider validation
- Performance benchmarking
- Cost tracking

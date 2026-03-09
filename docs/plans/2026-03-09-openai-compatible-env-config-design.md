# OpenAI-Compatible Env Config Design

## Goal

Add minimal `.env`-based provider configuration so local operators can switch Web and CLI from fake mode to real OpenAI-compatible providers such as Qwen and DeepSeek without manually exporting shell variables each time.

## Boundary

This change is a startup configuration improvement, not a provider platform expansion.

Included:
- Repo-root `.env` loading
- App-local `.env.local` overrides for Web and CLI
- `baseURL` support in runtime provider config
- Provider-specific API key override variables that work with OpenAI-compatible endpoints
- Optional provider display names for operator-facing summaries
- Documentation and tests for precedence and OpenAI-compatible usage

Excluded:
- New provider types for `qwen` or `deepseek`
- Provider marketplace behavior
- Config UI, auth, billing, or dashboard work
- Dynamic config reload at runtime

## Operator Experience

The intended configuration flow is:

1. Put shared provider settings in repo-root `.env`.
2. Optionally override app-specific settings in `apps/web/.env.local` or `apps/cli/.env.local`.
3. Keep `process.env` as the highest-priority source so CI, shells, or service managers can still override file-based defaults.
4. Restart the target process after changing env files.

Example:

```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=qwen
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=qwen-plus
```

## Configuration Model

### Loading order

Configuration is loaded in this order:

1. Repo root `.env`
2. App-local `.env.local`
3. Existing process environment

The loader must never overwrite an env var that already exists in `process.env`.

### Primary provider fields

Existing:
- `PROVIDER_MODE`
- `PROVIDER_TYPE`
- `MODEL_ID`
- `PROVIDER_TIMEOUT_MS`
- `PROVIDER_MAX_RETRIES`

New:
- `PROVIDER_API_KEY`
- `PROVIDER_BASE_URL`
- `PROVIDER_NAME`

Compatibility fallback for API keys:
- If `PROVIDER_API_KEY` is present, use it.
- Otherwise fall back to the existing typed env key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`).

### Fallback provider fields

Existing:
- `PROVIDER_FALLBACK_TYPE`
- `PROVIDER_FALLBACK_MODEL_ID`
- `PROVIDER_FALLBACK_TIMEOUT_MS`
- `PROVIDER_FALLBACK_MAX_RETRIES`

New:
- `PROVIDER_FALLBACK_API_KEY`
- `PROVIDER_FALLBACK_BASE_URL`
- `PROVIDER_FALLBACK_NAME`

Compatibility fallback:
- If `PROVIDER_FALLBACK_API_KEY` is present, use it.
- Otherwise fall back to the existing typed env key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) inferred from `PROVIDER_FALLBACK_TYPE`.

## Provider Semantics

`PROVIDER_TYPE` continues to represent the protocol/backend family used by the adapter. For Qwen and DeepSeek OpenAI-compatible endpoints, the type remains `openai`.

`PROVIDER_NAME` is strictly a display label for CLI/Web summaries and operator readability. It must not participate in routing, fallback, retries, or capability logic.

Examples:
- `PROVIDER_TYPE=openai` and `PROVIDER_NAME=qwen`
- `PROVIDER_TYPE=openai` and `PROVIDER_NAME=deepseek`

This preserves the current provider maturity architecture while making real-world OpenAI-compatible usage readable.

## Architecture

### Apps

`apps/web` and `apps/cli` should each load env files during startup before reading provider config. The loading utility should be minimal, deterministic, and shared only if that avoids unnecessary scope increase; otherwise duplicating a tiny loader is acceptable.

Each app config reader should extend its `RuntimeProviderConfig` mapping to include:
- `baseURL`
- display name
- provider API key override
- fallback equivalents

### Adapter

`packages/llm-adapter` already supports `LLMConfig.baseURL` internally. The runtime-facing config shape needs to expose:
- `baseURL`
- fallback `baseURL`
- optional display name fields

When converting runtime config to adapter config:
- pass `baseURL` through
- keep the actual provider classification as `openai` or `anthropic`
- carry display names only into provider metadata / summaries

### Summary behavior

Provider summaries should prefer the display name when present, while keeping model IDs unchanged. Internal capability and reliability behavior must remain keyed off the real provider type and model.

## Error Handling

The env loader should be conservative:
- Missing env files are ignored.
- Malformed lines should not crash the process; they should be skipped unless the current loader pattern in the repo already enforces stricter behavior.
- Real provider mode still fails fast later if required runtime fields are missing.

## Testing Strategy

Add tests for:
- env loading precedence: root `.env` < app `.env.local` < existing `process.env`
- provider config parsing of `PROVIDER_API_KEY` and fallback typed env vars
- `PROVIDER_BASE_URL` and `PROVIDER_FALLBACK_BASE_URL` passing through runtime config
- provider display name appearing in metadata/summary without changing provider-type semantics

Keep tests local and deterministic; no real provider calls are needed.

## Docs Impact

Update:
- `README.md`
- `docs/runbook.md`
- `docs/configuration.md`

The docs should include:
- root `.env` example
- Web-only or CLI-only `.env.local` override example
- Qwen example
- DeepSeek example
- explicit note that service restart is required after env changes

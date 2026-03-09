# Configuration Guide

## Environment Variables

## Env File Loading

Web and CLI support file-based env loading at startup.

Loading order:

1. repo root `.env`
2. app-local `.env.local`
3. existing process env

This means:

- app-local `.env.local` can override repo-root `.env`
- shell or service-manager env vars override both files
- changing env files requires a process restart

Supported app-local files:

- `apps/web/.env.local`
- `apps/cli/.env.local`

### Persistence Backend

```bash
# Use file backend (default)
PERSISTENCE_BACKEND=file

# Use SQLite backend
PERSISTENCE_BACKEND=sqlite
PERSISTENCE_CONNECTION=/path/to/db.sqlite

# Custom base path for file backend
PERSISTENCE_PATH=/custom/path
```

### Provider Mode

```bash
# Use fake provider (default, for CI/testing)
PROVIDER_MODE=fake

# Use real OpenAI provider (opt-in, requires API key)
PROVIDER_MODE=real
PROVIDER_TYPE=openai
OPENAI_API_KEY=sk-xxx
MODEL_ID=gpt-4o-mini

# Or use an OpenAI-compatible endpoint such as Qwen or DeepSeek
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=qwen
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=qwen-plus

# Or use Anthropic
PROVIDER_MODE=real
PROVIDER_TYPE=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_ID=claude-3-5-haiku-20241022
```

Additional provider variables:

```bash
# Preferred provider-specific override keys
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
PROVIDER_NAME=qwen

# Fallback provider overrides
PROVIDER_FALLBACK_TYPE=openai
PROVIDER_FALLBACK_API_KEY=your-fallback-key
PROVIDER_FALLBACK_BASE_URL=https://your-fallback-endpoint
PROVIDER_FALLBACK_NAME=deepseek
PROVIDER_FALLBACK_MODEL_ID=deepseek-chat
```

Notes:

- `PROVIDER_API_KEY` is preferred for OpenAI-compatible providers
- if `PROVIDER_API_KEY` is absent, the app still falls back to `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- `PROVIDER_NAME` is display-only and is safe to set to `qwen` or `deepseek`
- `PROVIDER_TYPE` stays `openai` for OpenAI-compatible endpoints

## Safe Defaults

- **Persistence**: File backend (no setup required)
- **Provider**: Fake provider (no API costs)

## Examples

### Local development (default)
```bash
prodmind-studio workflow "build a todo app"
```

### With SQLite persistence
```bash
PERSISTENCE_BACKEND=sqlite prodmind-studio workflow "build a todo app"
```

### With real provider (opt-in)
```bash
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx prodmind-studio workflow "build a todo app"
```

### With OpenAI-compatible Qwen via `.env`
```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=qwen
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=qwen-plus
```

### With OpenAI-compatible DeepSeek via `.env`
```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=deepseek
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=deepseek-chat
```

## Non-Goals

- No heavy configuration file system
- No configuration UI in CLI
- No complex config merging beyond repo `.env`, app `.env.local`, and process env precedence
- Environment variables only

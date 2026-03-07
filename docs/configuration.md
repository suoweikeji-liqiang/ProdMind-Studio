# Configuration Guide

## Environment Variables

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

# Use real provider (opt-in, requires API key)
PROVIDER_MODE=real
PROVIDER_TYPE=openai
OPENAI_API_KEY=sk-xxx
MODEL_ID=gpt-4o-mini

# Or use Anthropic
PROVIDER_MODE=real
PROVIDER_TYPE=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_ID=claude-3-5-haiku-20241022
```

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

## Non-Goals

- No heavy configuration file system
- No configuration UI in CLI
- No complex config merging
- Environment variables only

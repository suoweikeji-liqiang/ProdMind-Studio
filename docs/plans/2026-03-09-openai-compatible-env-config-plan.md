# OpenAI-Compatible Env Config Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal `.env`-based configuration loading and OpenAI-compatible provider runtime support so Web and CLI can use Qwen or DeepSeek endpoints without manual shell exports.

**Architecture:** Load env files at app startup with conservative precedence, extend runtime provider config to carry `baseURL` and optional display labels, and keep adapter routing/reliability behavior keyed to the real provider type. Provider display names remain operator-facing metadata only.

**Tech Stack:** TypeScript, Node.js `fs`/`path`, Vitest, existing `@prodmind/llm-adapter` runtime config flow.

---

### Task 1: Add env-file loading with deterministic precedence

**Files:**
- Create: `apps/web/src/env.test.ts`
- Create: `apps/cli/src/env.test.ts`
- Create: `apps/web/src/env.ts`
- Create: `apps/cli/src/env.ts`
- Modify: `apps/web/src/server.ts`
- Modify: `apps/cli/src/index.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadEnvFiles } from './env.js';

describe('loadEnvFiles', () => {
  it('loads repo .env then app .env.local without overriding process.env', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'prodmind-env-'));
    const appDir = path.join(rootDir, 'apps', 'web');
    mkdirSync(appDir, { recursive: true });
    writeFileSync(path.join(rootDir, '.env'), 'MODEL_ID=root-model\\nPROVIDER_MODE=real\\n');
    writeFileSync(path.join(appDir, '.env.local'), 'MODEL_ID=web-model\\n');

    process.env.PROVIDER_MODE = 'fake';

    loadEnvFiles({ rootDir, appDir });

    expect(process.env.PROVIDER_MODE).toBe('fake');
    expect(process.env.MODEL_ID).toBe('web-model');
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
pnpm exec vitest run apps/web/src/env.test.ts apps/cli/src/env.test.ts
```

Expected: FAIL because `env.ts` does not exist and startup files do not load env files yet.

**Step 3: Write the minimal implementation**

```ts
import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFiles(paths: { rootDir: string; appDir: string }): void {
  for (const filePath of [path.join(paths.rootDir, '.env'), path.join(paths.appDir, '.env.local')]) {
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\\r?\\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
```

Call the loader at startup in:
- `apps/web/src/server.ts` before config is read
- `apps/cli/src/index.ts` before commands execute

**Step 4: Run tests to verify they pass**

Run:
```bash
pnpm exec vitest run apps/web/src/env.test.ts apps/cli/src/env.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/env.ts apps/web/src/env.test.ts apps/web/src/server.ts apps/cli/src/env.ts apps/cli/src/env.test.ts apps/cli/src/index.ts
git commit -m "feat: load app env files at startup"
```

### Task 2: Extend runtime provider config for OpenAI-compatible endpoints

**Files:**
- Modify: `packages/llm-adapter/src/runtime.ts`
- Modify: `packages/llm-adapter/src/types.ts`
- Modify: `packages/llm-adapter/src/provider.ts`
- Modify: `packages/llm-adapter/src/provider.test.ts`

**Step 1: Write the failing tests**

Add tests to `packages/llm-adapter/src/provider.test.ts` that assert:
- runtime config accepts `baseURL`
- runtime config accepts optional display names
- metadata uses the display name when present
- fallback metadata uses fallback display name when present
- actual provider type still controls the backend selection and route summaries

Example assertion shape:

```ts
it('uses display name without changing provider type semantics', () => {
  const adapter = createRuntimeAdapter(
    {
      mode: 'real',
      type: 'openai',
      apiKey: 'test-key',
      modelId: 'qwen-plus',
      baseURL: 'https://example.test/v1',
      name: 'qwen',
    },
    {}
  );
});
```

If mocking real SDK creation is simpler than instantiating a real provider, add a focused unit around the profile-building logic instead.

**Step 2: Run tests to verify they fail**

Run:
```bash
pnpm exec vitest run packages/llm-adapter/src/provider.test.ts
```

Expected: FAIL because runtime config does not expose `baseURL` or display-name fields yet.

**Step 3: Write the minimal implementation**

Extend runtime and adapter config types with:
- `baseURL?: string`
- `name?: string`
- fallback `baseURL?: string`
- fallback `name?: string`

Pass `baseURL` through to `LLMConfig`.

When building provider profiles, prefer:
- `providerName = config.name ?? config.provider`
- `fallbackProvider = config.fallback?.name ?? config.fallback?.provider`

Do not change routing, capability, retry, or fallback logic to depend on display names.

**Step 4: Run tests to verify they pass**

Run:
```bash
pnpm exec vitest run packages/llm-adapter/src/provider.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/llm-adapter/src/runtime.ts packages/llm-adapter/src/types.ts packages/llm-adapter/src/provider.ts packages/llm-adapter/src/provider.test.ts
git commit -m "feat: support openai-compatible provider runtime config"
```

### Task 3: Wire app config parsing for provider overrides and display names

**Files:**
- Modify: `apps/web/src/config.ts`
- Modify: `apps/cli/src/config.ts`
- Create: `apps/web/src/config.test.ts`
- Create: `apps/cli/src/config.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:
- `PROVIDER_API_KEY` overrides typed API key lookup
- typed API keys still work as fallback
- `PROVIDER_BASE_URL` and `PROVIDER_FALLBACK_BASE_URL` are mapped
- `PROVIDER_NAME` and `PROVIDER_FALLBACK_NAME` are mapped

Example:

```ts
it('prefers PROVIDER_API_KEY and PROVIDER_BASE_URL for openai-compatible endpoints', () => {
  process.env.PROVIDER_MODE = 'real';
  process.env.PROVIDER_TYPE = 'openai';
  process.env.PROVIDER_API_KEY = 'compat-key';
  process.env.PROVIDER_BASE_URL = 'https://compat.example/v1';
  process.env.MODEL_ID = 'deepseek-chat';
  process.env.PROVIDER_NAME = 'deepseek';

  const config = loadProviderConfig();

  expect(config.apiKey).toBe('compat-key');
  expect(config.baseURL).toBe('https://compat.example/v1');
  expect(config.name).toBe('deepseek');
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
pnpm exec vitest run apps/web/src/config.test.ts apps/cli/src/config.test.ts
```

Expected: FAIL because config readers do not parse the new env vars yet.

**Step 3: Write the minimal implementation**

Update both config readers to:
- read `PROVIDER_API_KEY` before typed provider key lookup
- read `PROVIDER_BASE_URL`
- read `PROVIDER_NAME`
- read fallback equivalents

Keep existing timeout, retry, and pricing parsing unchanged.

**Step 4: Run tests to verify they pass**

Run:
```bash
pnpm exec vitest run apps/web/src/config.test.ts apps/cli/src/config.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/config.ts apps/web/src/config.test.ts apps/cli/src/config.ts apps/cli/src/config.test.ts
git commit -m "feat: parse openai-compatible provider env overrides"
```

### Task 4: Update operator docs and add regression coverage

**Files:**
- Modify: `README.md`
- Modify: `docs/runbook.md`
- Modify: `docs/configuration.md`
- Modify: `apps/web/src/web.test.ts`
- Modify: `apps/cli/src/commands.test.ts`

**Step 1: Write the failing tests**

Add or update UI/CLI summary assertions so operator-facing output can display the configured provider name without changing the model summary.

Example:

```ts
expect(html).toContain('qwen/qwen-plus');
```

and

```ts
expect(output).toContain('deepseek/deepseek-chat');
```

**Step 2: Run tests to verify they fail**

Run:
```bash
pnpm exec vitest run apps/web/src/web.test.ts apps/cli/src/commands.test.ts
```

Expected: FAIL until display-name-backed summaries and docs-related examples are updated coherently.

**Step 3: Write the minimal implementation**

Update Web/CLI summary fixtures to use display names in operator-facing examples, then update docs with:
- root `.env` example
- `apps/web/.env.local` override example
- `apps/cli/.env.local` override example
- Qwen example
- DeepSeek example
- reminder to restart Web/CLI after env changes

**Step 4: Run tests to verify they pass**

Run:
```bash
pnpm exec vitest run apps/web/src/web.test.ts apps/cli/src/commands.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add README.md docs/runbook.md docs/configuration.md apps/web/src/web.test.ts apps/cli/src/commands.test.ts
git commit -m "docs: document env-based openai-compatible provider config"
```

### Task 5: Verify the integrated behavior

**Files:**
- Modify if needed: any files touched above to fix verification regressions

**Step 1: Run focused package tests**

Run:
```bash
pnpm exec vitest run packages/llm-adapter/src/provider.test.ts apps/web/src/env.test.ts apps/web/src/config.test.ts apps/web/src/web.test.ts apps/cli/src/env.test.ts apps/cli/src/config.test.ts apps/cli/src/commands.test.ts
```

Expected: PASS

**Step 2: Run workspace quality gates**

Run:
```bash
pnpm run check:all
```

Expected: PASS

**Step 3: Manual operator validation**

Run:
```bash
pnpm run dev:web
```

Create:
```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=qwen
PROVIDER_API_KEY=test-key
PROVIDER_BASE_URL=https://example.test/v1
MODEL_ID=qwen-plus
```

Expected:
- startup succeeds
- Web/CLI summary shows `qwen`
- real calls still require a valid endpoint/key to succeed
- changing env files requires process restart

**Step 4: Final commit**

```bash
git add README.md docs/runbook.md docs/configuration.md apps/web/src env packages/llm-adapter/src
git commit -m "feat: support env-based openai-compatible llm config"
```

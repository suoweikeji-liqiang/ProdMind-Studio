import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PersistenceConfig } from '@prodmind/shared-types';
import type { RuntimeProviderConfig } from '@prodmind/llm-adapter';

export type RuntimeConfig = {
  persistence: PersistenceConfig;
  provider: RuntimeProviderConfig;
};

type EnvMap = Record<string, string | undefined>;

function readNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveEnvPaths(moduleUrl: string): { rootDir: string; appDir: string } {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  const appDir = path.resolve(moduleDir, '..');
  const rootDir = path.resolve(appDir, '..', '..');
  return { rootDir, appDir };
}

function parseEnvLine(line: string): [key: string, value: string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const separatorIndex = normalized.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  let value = normalized.slice(separatorIndex + 1).trim();
  if (!key) {
    return null;
  }

  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export function loadEnvFiles(
  env: EnvMap = process.env,
  paths: { rootDir: string; appDir: string } = resolveEnvPaths(import.meta.url)
): void {
  const lockedKeys = new Set(
    Object.keys(env).filter(key => typeof env[key] !== 'undefined')
  );

  for (const filePath of [path.join(paths.rootDir, '.env'), path.join(paths.appDir, '.env.local')]) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) {
        continue;
      }

      const [key, value] = entry;
      if (lockedKeys.has(key)) {
        continue;
      }

      env[key] = value;
    }
  }
}

function resolveProviderApiKey(
  env: EnvMap,
  providerType: 'openai' | 'anthropic'
): string | undefined {
  return env.PROVIDER_API_KEY ?? env[`${providerType.toUpperCase()}_API_KEY`];
}

function resolveFallbackApiKey(
  env: EnvMap,
  providerType: 'openai' | 'anthropic' | undefined
): string | undefined {
  if (!providerType) {
    return undefined;
  }

  return env.PROVIDER_FALLBACK_API_KEY ?? env[`${providerType.toUpperCase()}_API_KEY`];
}

function loadProviderConfigFromEnv(env: EnvMap): RuntimeProviderConfig {
  const providerMode = (env.PROVIDER_MODE || 'fake') as 'fake' | 'real';
  const providerType = (env.PROVIDER_TYPE || 'openai') as 'openai' | 'anthropic';
  const fallbackType = env.PROVIDER_FALLBACK_TYPE as 'openai' | 'anthropic' | undefined;

  const provider = {
    mode: providerMode,
    type: providerType,
    apiKey: resolveProviderApiKey(env, providerType),
    name: env.PROVIDER_NAME,
    modelId: env.MODEL_ID,
    baseURL: env.PROVIDER_BASE_URL,
    timeoutMs: readNumber(env.PROVIDER_TIMEOUT_MS),
    maxRetries: readNumber(env.PROVIDER_MAX_RETRIES),
    pricing: readNumber(env.PROVIDER_PRICE_INPUT_PER_MILLION_USD) || readNumber(env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD)
      ? {
          inputPerMillionUsd: readNumber(env.PROVIDER_PRICE_INPUT_PER_MILLION_USD),
          outputPerMillionUsd: readNumber(env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD),
        }
      : undefined,
    fallback: fallbackType
      ? {
          type: fallbackType,
          apiKey: resolveFallbackApiKey(env, fallbackType),
          name: env.PROVIDER_FALLBACK_NAME,
          modelId: env.PROVIDER_FALLBACK_MODEL_ID,
          baseURL: env.PROVIDER_FALLBACK_BASE_URL,
          timeoutMs: readNumber(env.PROVIDER_FALLBACK_TIMEOUT_MS),
          maxRetries: readNumber(env.PROVIDER_FALLBACK_MAX_RETRIES),
          pricing: readNumber(env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD) || readNumber(env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD)
            ? {
                inputPerMillionUsd: readNumber(env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD),
                outputPerMillionUsd: readNumber(env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD),
              }
            : undefined,
        }
      : undefined,
  } satisfies RuntimeProviderConfig;

  return provider;
}

export function loadConfigFromEnv(env: EnvMap): RuntimeConfig {
  const persistenceBackend = (env.PERSISTENCE_BACKEND || 'file') as 'file' | 'sqlite';

  return {
    persistence: {
      backend: persistenceBackend,
      basePath: env.PERSISTENCE_PATH,
      connectionString: env.PERSISTENCE_CONNECTION,
    },
    provider: loadProviderConfigFromEnv(env),
  };
}

export function loadConfig(): RuntimeConfig {
  return loadConfigFromEnv(process.env);
}

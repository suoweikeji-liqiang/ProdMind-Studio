import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

function createTempDirs(appName: 'web' | 'cli') {
  const rootDir = mkdtempSync(path.join(tmpdir(), `prodmind-${appName}-env-`));
  const appDir = path.join(rootDir, 'apps', appName);
  mkdirSync(appDir, { recursive: true });
  return { rootDir, appDir };
}

describe('web config', () => {
  it('loads repo .env and app .env.local without overriding existing env values', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadEnvFiles).toBe('function');
    if (typeof configModule.loadEnvFiles !== 'function') {
      return;
    }

    const { rootDir, appDir } = createTempDirs('web');
    try {
      writeFileSync(path.join(rootDir, '.env'), [
        'PROVIDER_MODE=real',
        'MODEL_ID=root-model',
        'OPENAI_API_KEY=root-key',
      ].join('\n'));
      writeFileSync(path.join(appDir, '.env.local'), [
        'MODEL_ID=web-model',
        'OPENAI_API_KEY=web-key',
      ].join('\n'));

      const env = {
        PROVIDER_MODE: 'fake',
        OPENAI_API_KEY: 'process-key',
      } as NodeJS.ProcessEnv;

      configModule.loadEnvFiles(env, { rootDir, appDir });

      expect(env.PROVIDER_MODE).toBe('fake');
      expect(env.MODEL_ID).toBe('web-model');
      expect(env.OPENAI_API_KEY).toBe('process-key');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('parses openai-compatible provider overrides including display names', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadProviderConfigFromEnv).toBe('function');
    if (typeof configModule.loadProviderConfigFromEnv !== 'function') {
      return;
    }

    const config = configModule.loadProviderConfigFromEnv({
      PROVIDER_MODE: 'real',
      PROVIDER_TYPE: 'openai',
      PROVIDER_API_KEY: 'compat-key',
      OPENAI_API_KEY: 'typed-key',
      PROVIDER_BASE_URL: 'https://compat.example/v1',
      PROVIDER_NAME: 'deepseek',
      MODEL_ID: 'deepseek-chat',
      PROVIDER_FALLBACK_TYPE: 'openai',
      PROVIDER_FALLBACK_API_KEY: 'fallback-key',
      PROVIDER_FALLBACK_BASE_URL: 'https://fallback.example/v1',
      PROVIDER_FALLBACK_NAME: 'qwen',
      PROVIDER_FALLBACK_MODEL_ID: 'qwen-plus',
    } as NodeJS.ProcessEnv);

    expect(config.mode).toBe('real');
    expect(config.type).toBe('openai');
    expect(config.apiKey).toBe('compat-key');
    expect(config.baseURL).toBe('https://compat.example/v1');
    expect(config.name).toBe('deepseek');
    expect(config.modelId).toBe('deepseek-chat');
    expect(config.fallback).toMatchObject({
      type: 'openai',
      apiKey: 'fallback-key',
      baseURL: 'https://fallback.example/v1',
      name: 'qwen',
      modelId: 'qwen-plus',
    });
  });

  it('falls back to typed provider api keys when provider override keys are absent', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadProviderConfigFromEnv).toBe('function');
    if (typeof configModule.loadProviderConfigFromEnv !== 'function') {
      return;
    }

    const config = configModule.loadProviderConfigFromEnv({
      PROVIDER_MODE: 'real',
      PROVIDER_TYPE: 'anthropic',
      ANTHROPIC_API_KEY: 'anthropic-key',
      MODEL_ID: 'claude-3-5-haiku-20241022',
    } as NodeJS.ProcessEnv);

    expect(config.apiKey).toBe('anthropic-key');
    expect(config.type).toBe('anthropic');
    expect(config.modelId).toBe('claude-3-5-haiku-20241022');
  });
});

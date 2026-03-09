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

describe('cli config', () => {
  it('loads repo .env and app .env.local without overriding existing env values', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadEnvFiles).toBe('function');
    if (typeof configModule.loadEnvFiles !== 'function') {
      return;
    }

    const { rootDir, appDir } = createTempDirs('cli');
    try {
      writeFileSync(path.join(rootDir, '.env'), [
        'PERSISTENCE_BACKEND=sqlite',
        'MODEL_ID=root-model',
      ].join('\n'));
      writeFileSync(path.join(appDir, '.env.local'), [
        'MODEL_ID=cli-model',
        'PERSISTENCE_PATH=./cli-project',
      ].join('\n'));

      const env = {
        PERSISTENCE_BACKEND: 'file',
      } as NodeJS.ProcessEnv;

      configModule.loadEnvFiles(env, { rootDir, appDir });

      expect(env.PERSISTENCE_BACKEND).toBe('file');
      expect(env.MODEL_ID).toBe('cli-model');
      expect(env.PERSISTENCE_PATH).toBe('./cli-project');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('parses openai-compatible provider overrides including display names', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadConfigFromEnv).toBe('function');
    if (typeof configModule.loadConfigFromEnv !== 'function') {
      return;
    }

    const config = configModule.loadConfigFromEnv({
      PERSISTENCE_BACKEND: 'file',
      PROVIDER_MODE: 'real',
      PROVIDER_TYPE: 'openai',
      PROVIDER_API_KEY: 'compat-key',
      PROVIDER_BASE_URL: 'https://compat.example/v1',
      PROVIDER_NAME: 'qwen',
      MODEL_ID: 'qwen-plus',
      PROVIDER_FALLBACK_TYPE: 'openai',
      PROVIDER_FALLBACK_API_KEY: 'fallback-key',
      PROVIDER_FALLBACK_BASE_URL: 'https://fallback.example/v1',
      PROVIDER_FALLBACK_NAME: 'deepseek',
      PROVIDER_FALLBACK_MODEL_ID: 'deepseek-chat',
    } as NodeJS.ProcessEnv);

    expect(config.persistence.backend).toBe('file');
    expect(config.provider.apiKey).toBe('compat-key');
    expect(config.provider.baseURL).toBe('https://compat.example/v1');
    expect(config.provider.name).toBe('qwen');
    expect(config.provider.modelId).toBe('qwen-plus');
    expect(config.provider.fallback).toMatchObject({
      type: 'openai',
      apiKey: 'fallback-key',
      baseURL: 'https://fallback.example/v1',
      name: 'deepseek',
      modelId: 'deepseek-chat',
    });
  });

  it('falls back to typed provider api keys when provider override keys are absent', async () => {
    const configModule = await import('./config.js');
    expect(typeof configModule.loadConfigFromEnv).toBe('function');
    if (typeof configModule.loadConfigFromEnv !== 'function') {
      return;
    }

    const config = configModule.loadConfigFromEnv({
      PERSISTENCE_BACKEND: 'file',
      PROVIDER_MODE: 'real',
      PROVIDER_TYPE: 'anthropic',
      ANTHROPIC_API_KEY: 'anthropic-key',
      MODEL_ID: 'claude-3-5-haiku-20241022',
    } as NodeJS.ProcessEnv);

    expect(config.provider.apiKey).toBe('anthropic-key');
    expect(config.provider.type).toBe('anthropic');
    expect(config.provider.modelId).toBe('claude-3-5-haiku-20241022');
  });
});

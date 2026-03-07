import type { PersistenceConfig } from '@prodmind/shared-types';

export type RuntimeConfig = {
  persistence: PersistenceConfig;
  provider: {
    mode: 'fake' | 'real';
    type?: 'openai' | 'anthropic';
    apiKey?: string;
    modelId?: string;
  };
};

export function loadConfig(): RuntimeConfig {
  const persistenceBackend = (process.env.PERSISTENCE_BACKEND || 'file') as 'file' | 'sqlite';
  const providerMode = (process.env.PROVIDER_MODE || 'fake') as 'fake' | 'real';
  const providerType = (process.env.PROVIDER_TYPE || 'openai') as 'openai' | 'anthropic';

  return {
    persistence: {
      backend: persistenceBackend,
      basePath: process.env.PERSISTENCE_PATH,
      connectionString: process.env.PERSISTENCE_CONNECTION,
    },
    provider: {
      mode: providerMode,
      type: providerType,
      apiKey: process.env[`${providerType.toUpperCase()}_API_KEY`],
      modelId: process.env.MODEL_ID,
    },
  };
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createLLMAdapterMock, fakeAdapter } = vi.hoisted(() => {
  const adapter = {
    streamText: vi.fn(),
    generateStructured: vi.fn(),
    getMetadata: vi.fn(() => ({
      providerName: 'fake',
      modelName: 'fake-model',
      enabled: true,
      capabilities: {
        structuredOutput: true,
        streaming: true,
      },
      reliability: {
        defaultTimeoutMs: 1000,
        maxTimeoutMs: 1000,
        defaultMaxRetries: 0,
        maxRetriesLimit: 0,
        fallbackEligible: false,
      },
      usage: {
        tokenAccounting: 'unavailable',
        costAccounting: 'unavailable',
      },
    })),
    getExecutionLog: vi.fn(() => []),
    clearExecutionLog: vi.fn(),
  };

  return {
    createLLMAdapterMock: vi.fn(() => adapter),
    fakeAdapter: adapter,
  };
});

vi.mock('./provider.js', () => ({
  createLLMAdapter: createLLMAdapterMock,
}));

import { createRuntimeAdapter } from './runtime.js';

describe('runtime provider config', () => {
  beforeEach(() => {
    createLLMAdapterMock.mockClear();
  });

  it('passes baseURL and display names through to the real adapter config', () => {
    const adapter = createRuntimeAdapter(
      {
        mode: 'real',
        type: 'openai',
        apiKey: 'compat-key',
        name: 'qwen',
        modelId: 'qwen-plus',
        baseURL: 'https://compat.example/v1',
        fallback: {
          type: 'openai',
          apiKey: 'fallback-key',
          name: 'deepseek',
          modelId: 'deepseek-chat',
          baseURL: 'https://fallback.example/v1',
        },
      },
      {}
    );

    expect(adapter).toBe(fakeAdapter);
    expect(createLLMAdapterMock).toHaveBeenCalledWith({
      provider: 'openai',
      apiKey: 'compat-key',
      name: 'qwen',
      modelId: 'qwen-plus',
      baseURL: 'https://compat.example/v1',
      timeoutMs: undefined,
      maxTimeoutMs: undefined,
      maxRetries: undefined,
      maxRetriesLimit: undefined,
      fallbackMode: undefined,
      pricing: undefined,
      fallback: {
        provider: 'openai',
        apiKey: 'fallback-key',
        name: 'deepseek',
        modelId: 'deepseek-chat',
        baseURL: 'https://fallback.example/v1',
        timeoutMs: undefined,
        maxTimeoutMs: undefined,
        maxRetries: undefined,
        maxRetriesLimit: undefined,
        fallbackMode: undefined,
        pricing: undefined,
      },
    });
  });
});

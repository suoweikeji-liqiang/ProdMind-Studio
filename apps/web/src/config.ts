import type { RuntimeProviderConfig } from '@prodmind/llm-adapter';

function readNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function loadProviderConfig(): RuntimeProviderConfig {
  const providerMode = (process.env.PROVIDER_MODE || 'fake') as 'fake' | 'real';
  const providerType = (process.env.PROVIDER_TYPE || 'openai') as 'openai' | 'anthropic';
  const fallbackType = process.env.PROVIDER_FALLBACK_TYPE as 'openai' | 'anthropic' | undefined;

  return {
    mode: providerMode,
    type: providerType,
    apiKey: process.env[`${providerType.toUpperCase()}_API_KEY`],
    modelId: process.env.MODEL_ID,
    timeoutMs: readNumber(process.env.PROVIDER_TIMEOUT_MS),
    maxRetries: readNumber(process.env.PROVIDER_MAX_RETRIES),
    pricing: readNumber(process.env.PROVIDER_PRICE_INPUT_PER_MILLION_USD) || readNumber(process.env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD)
      ? {
          inputPerMillionUsd: readNumber(process.env.PROVIDER_PRICE_INPUT_PER_MILLION_USD),
          outputPerMillionUsd: readNumber(process.env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD),
        }
      : undefined,
    fallback: fallbackType
      ? {
          type: fallbackType,
          apiKey: process.env[`${fallbackType.toUpperCase()}_API_KEY`],
          modelId: process.env.PROVIDER_FALLBACK_MODEL_ID,
          timeoutMs: readNumber(process.env.PROVIDER_FALLBACK_TIMEOUT_MS),
          maxRetries: readNumber(process.env.PROVIDER_FALLBACK_MAX_RETRIES),
          pricing: readNumber(process.env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD) || readNumber(process.env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD)
            ? {
                inputPerMillionUsd: readNumber(process.env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD),
                outputPerMillionUsd: readNumber(process.env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD),
              }
            : undefined,
        }
      : undefined,
  };
}

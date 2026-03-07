export type ProviderError = {
  type: 'rate_limit' | 'auth' | 'network' | 'invalid_request' | 'model_error' | 'unknown';
  message: string;
  retryable: boolean;
  originalError?: unknown;
};

export type ProviderCapabilities = {
  streaming: boolean;
  structuredOutput: boolean;
  maxTokens?: number;
};

export type ProviderMetadata = {
  name: string;
  version: string;
  capabilities: ProviderCapabilities;
};

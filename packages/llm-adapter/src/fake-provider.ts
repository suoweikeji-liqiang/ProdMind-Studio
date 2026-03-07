import type { z } from 'zod';
import type { ProviderMetadata } from './types.js';

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface LLMAdapter {
  streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string>;
  generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T>;
  getMetadata(): ProviderMetadata;
}

export function createFakeProvider(responses: Record<string, unknown>): LLMAdapter {
  return {
    async streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string> {
      const key = messages[messages.length - 1]?.content || 'default';
      const response = (responses[key] as string) || 'fake response';

      for (const char of response) {
        onToken(char);
      }

      return response;
    },

    async generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
      const key = messages[messages.length - 1]?.content || 'default';
      const response = responses[key];

      if (!response) {
        throw new Error('No fake response configured');
      }

      return schema.parse(response);
    },

    getMetadata(): ProviderMetadata {
      return {
        name: 'fake',
        version: '1.0.0',
        capabilities: {
          streaming: true,
          structuredOutput: true,
        },
      };
    },
  };
}

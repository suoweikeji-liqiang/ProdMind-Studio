import type { z } from 'zod';

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface LLMAdapter {
  streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string>;
  generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T>;
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
  };
}

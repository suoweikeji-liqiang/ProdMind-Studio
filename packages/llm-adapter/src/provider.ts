import { streamText as sdkStreamText, generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonrepair } from 'jsonrepair';
import type { LanguageModel, CoreMessage } from 'ai';
import type { z } from 'zod';

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMAdapter {
  streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string>;
  generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T>;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  modelId: string;
  baseURL?: string;
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {

  let model: LanguageModel;

  if (config.provider === 'openai') {
    const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = openai(config.modelId);
  } else if (config.provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = anthropic(config.modelId);
  } else {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  return {
    async streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<string> {
      const result = await sdkStreamText({
        model,
        messages: messages as CoreMessage[],
      });

      let fullText = '';
      for await (const delta of result.textStream) {
        fullText += delta;
        onToken(delta);
      }
      return fullText;
    },

    async generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<T> {
      try {
        const result = await generateText({
          model,
          messages: messages as CoreMessage[],
          experimental_output: Output.object({ schema }),
        });
        return result.experimental_output as T;
      } catch {
        const rawResult = await generateText({
          model,
          messages: messages as CoreMessage[],
        });

        const rawText = rawResult.text;
        const stripped = rawText.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
        const repaired = jsonrepair(stripped);
        const parsed = JSON.parse(repaired) as unknown;

        return schema.parse(parsed);
      }
    },
  };
}

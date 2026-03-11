import { describe, expect, it } from 'vitest';
import type { ProviderCapabilityProfile, ProviderExecutionSummary } from '@prodmind/shared-types';
import type { LLMAdapter, LLMMessage, LLMRequestOptions } from '@prodmind/llm-adapter';
import { runChallengeRound } from './runner.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMetadata(): ProviderCapabilityProfile {
  return {
    providerName: 'fake',
    modelName: 'fake-default',
    enabled: true,
    capabilities: {
      structuredOutput: true,
      streaming: true,
    },
    reliability: {
      timeoutMs: 100,
      maxRetries: 0,
      fallbackEligible: false,
    },
    usage: {
      tokenAccounting: 'unavailable',
      costAccounting: 'unavailable',
    },
  };
}

describe('runChallengeRound', () => {
  it('runs assassin and userGhost in parallel after the architect stage', async () => {
    let callCount = 0;
    const adapter: LLMAdapter = {
      async streamText(
        _messages: LLMMessage[],
        _onToken: (token: string) => void,
        _correlation,
        _options?: LLMRequestOptions,
      ): Promise<string> {
        callCount += 1;
        const currentCall = callCount;

        if (currentCall === 1) {
          await wait(15);
          return 'architect';
        }
        if (currentCall === 2) {
          await wait(90);
          return 'assassin';
        }
        if (currentCall === 3) {
          await wait(90);
          return 'userGhost';
        }

        await wait(15);
        return 'grounder';
      },
      async generateStructured(): Promise<never> {
        throw new Error('not used');
      },
      getMetadata(): ProviderCapabilityProfile {
        return createMetadata();
      },
      getExecutionLog(): ProviderExecutionSummary[] {
        return [];
      },
      clearExecutionLog(): void {},
    };

    const start = Date.now();
    const round = await runChallengeRound(
      adapter,
      {
        idea: 'idea',
        userConfirm: 'confirm',
        userResponse: 'response',
      },
      1,
    );
    const durationMs = Date.now() - start;

    expect(round.assassin).toBe('assassin');
    expect(round.userGhost).toBe('userGhost');
    expect(durationMs).toBeLessThan(170);
  });

  it('passes the latest user confirmation and response into the grounder prompt', async () => {
    const prompts: string[] = [];
    const adapter: LLMAdapter = {
      async streamText(
        messages: LLMMessage[],
        _onToken: (token: string) => void,
      ): Promise<string> {
        prompts.push(String(messages[1]?.content ?? ''));
        return `response-${prompts.length}`;
      },
      async generateStructured(): Promise<never> {
        throw new Error('not used');
      },
      getMetadata(): ProviderCapabilityProfile {
        return createMetadata();
      },
      getExecutionLog(): ProviderExecutionSummary[] {
        return [];
      },
      clearExecutionLog(): void {},
    };

    await runChallengeRound(
      adapter,
      {
        idea: 'idea',
        userConfirm: 'confirm from user',
        userResponse: 'response from user',
      },
      2,
    );

    expect(prompts[3]).toContain('confirm from user');
    expect(prompts[3]).toContain('response from user');
    expect(prompts[3]).not.toContain('{input.userConfirm}');
    expect(prompts[3]).not.toContain('{input.userResponse}');
  });

  it('degrades a timed out parallel role into a visible system note instead of failing the round', async () => {
    const prompts: string[] = [];
    let callCount = 0;

    const adapter: LLMAdapter = {
      async streamText(
        messages: LLMMessage[],
        _onToken: (token: string) => void,
      ): Promise<string> {
        prompts.push(String(messages[1]?.content ?? ''));
        callCount += 1;

        if (callCount === 1) {
          return 'architect';
        }
        if (callCount === 2) {
          throw new Error('Provider request timed out');
        }
        if (callCount === 3) {
          return 'userGhost';
        }

        return 'grounder';
      },
      async generateStructured(): Promise<never> {
        throw new Error('not used');
      },
      getMetadata(): ProviderCapabilityProfile {
        return createMetadata();
      },
      getExecutionLog(): ProviderExecutionSummary[] {
        return [];
      },
      clearExecutionLog(): void {}
    };

    const round = await runChallengeRound(
      adapter,
      {
        idea: 'idea',
        userConfirm: 'confirm',
        userResponse: 'response',
      },
      1,
    );

    expect(round.assassin).toContain('system fallback');
    expect(round.assassin).toContain('Provider request timed out');
    expect(round.userGhost).toBe('userGhost');
    expect(round.grounder).toBe('grounder');
    expect(prompts[3]).toContain('Provider request timed out');
  });
});

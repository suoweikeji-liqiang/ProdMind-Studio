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
        return [
          '## 当前最强假设',
          '1. 这个议题值得继续追问。',
          '',
          '## MVP边界',
          '先聚焦一条真实阻塞链路。',
          '',
          '## 本轮证伪检查',
          '当前最重要假设：这个问题不是偶发噪音。',
          '如果我是错的：团队只是暂时沟通不顺，并不需要新系统。',
          '最小动作：补一个最近发生的真实案例。',
        ].join('\n');
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

  it('degrades a timed out parallel role into a usable Chinese fallback instead of raw English timeout text', async () => {
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

    expect(round.assassin).toContain('系统降级说明');
    expect(round.assassin).toContain('最小反方质疑');
    expect(round.assassin).not.toContain('system fallback');
    expect(round.assassin).not.toContain('Provider request timed out');
    expect(round.userGhost).toBe('userGhost');
    expect(round.grounder).toBe('grounder');
    expect(prompts[3]).not.toContain('Provider request timed out');
  });

  it('retries the grounder once when the falsification block is missing', async () => {
    const prompts: string[] = [];
    let grounderCalls = 0;
    const adapter: LLMAdapter = {
      async streamText(
        messages: LLMMessage[],
        _onToken: (token: string) => void,
      ): Promise<string> {
        prompts.push(String(messages[1]?.content ?? ''));

        if (prompts.length === 1) {
          return 'architect';
        }
        if (prompts.length === 2) {
          return 'assassin';
        }
        if (prompts.length === 3) {
          return 'userGhost';
        }

        grounderCalls += 1;
        if (grounderCalls === 1) {
          return '## MVP边界\n先做最小流程';
        }

        return [
          '## 当前最重要假设',
          '这个痛点值得优先解决。',
          '',
          '## MVP边界',
          '先验证最痛的一步。',
          '',
          '## 本轮证伪检查',
          '当前最重要假设：团队确实被这个问题持续卡住。',
          '如果我是错的：这只是偶发噪音，不值得做新系统。',
          '最小动作：补一个最近发生的真实案例。',
        ].join('\n');
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
        userConfirm: 'confirm from user',
        userResponse: 'response from user with enough detail to continue the challenge flow safely',
      },
      1,
    );

    expect(grounderCalls).toBe(2);
    expect(prompts[4]).toContain('证伪检查');
    expect(round.grounder).toContain('当前最重要假设');
    expect((round.conflicts ?? []).some((conflict) => conflict.type === 'falsification_missing')).toBe(false);
  });
});

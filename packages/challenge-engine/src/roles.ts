import type { LLMAdapter, LLMMessage } from '@prodmind/llm-adapter';
import type { ChallengeRole } from '@prodmind/shared-types';

export interface RoleConfig {
  name: ChallengeRole;
  systemPrompt: string;
  temperature: number;
}

export interface RoleCallOptions {
  userInput: string;
  architectOutput?: string;
  assassinOutput?: string;
  userGhostOutput?: string;
  userResponse?: string;
  roundHistory?: string;
}

const ARCHITECT_PROMPT = `你是架构师角色。你的任务是从用户的模糊想法中提炼核心问题定义。
输出格式：
## 核心问题
[一句话问题定义]

## 目标用户
[谁会用这个]

## 当前痛点
[现在怎么做的，为什么不好]`;

const ASSASSIN_PROMPT = `你是刺客角色。你的任务是攻击架构师的问题定义，提出反对理由。
你必须强制反对，不能同意。
输出格式：
## 隐含假设
[架构师隐含的假设]

## 反对理由
[为什么这个假设可能是错的]`;

const USER_GHOST_PROMPT = `你是用户鬼角色。你站在用户视角质疑这个方案。
输出格式：
## 用户质疑
[用户会问什么问题]

## 替代方案
[用户可能更想要什么]`;

const GROUNDER_PROMPT = `你是落地者角色。你的任务是收敛辩论，生成假设清单和MVP边界。
输出格式：
## 当前最强假设
[核心假设列表]

## MVP边界
[本版本包含什么，明确排除什么]

## 本轮证伪检查
当前最重要假设：[假设]
如果我是错的，最可能因为什么？[原因]
验证这个假设的最小动作是什么？[行动]`;

export function getRoleConfig(role: ChallengeRole): RoleConfig {
  const configs: Record<ChallengeRole, RoleConfig> = {
    architect: { name: 'architect', systemPrompt: ARCHITECT_PROMPT, temperature: 0.4 },
    assassin: { name: 'assassin', systemPrompt: ASSASSIN_PROMPT, temperature: 0.8 },
    userGhost: { name: 'userGhost', systemPrompt: USER_GHOST_PROMPT, temperature: 0.4 },
    grounder: { name: 'grounder', systemPrompt: GROUNDER_PROMPT, temperature: 0.4 },
  };
  return configs[role];
}

export async function callRole(
  adapter: LLMAdapter,
  role: ChallengeRole,
  userMessage: string
): Promise<string> {
  const config = getRoleConfig(role);
  const messages: LLMMessage[] = [
    { role: 'system', content: config.systemPrompt },
    { role: 'user', content: userMessage },
  ];

  return adapter.streamText(messages, () => {});
}

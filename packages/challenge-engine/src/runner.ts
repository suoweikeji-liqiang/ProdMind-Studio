import type { LLMAdapter } from '@prodmind/llm-adapter';
import type { ChallengeRole, ChallengeRound, ChallengeSession, ChallengeSummary } from '@prodmind/shared-types';
import { callRole, type RoleCallOptions } from './roles.js';
import { detectConflicts, validateFalsificationBlock } from './rules.js';

export type { RoleCallOptions };

export interface ChallengeInput {
  idea: string;
  userConfirm: string;
  userResponse: string;
}

export interface ArchitectFramingResult {
  architect: string;
}

export interface ObjectionGenerationResult {
  assassin: string;
  userGhost: string;
}

export interface GroundingResult {
  grounder: string;
  conflicts: ChallengeRound['conflicts'];
}

const CHALLENGE_ROLE_LABELS: Record<ChallengeRole, string> = {
  architect: '架构师',
  assassin: '刺客',
  userGhost: '用户幽灵',
  grounder: '锚点官',
};

function summarizeError(error: unknown): string {
  const message = error instanceof Error && error.message
    ? error.message.toLowerCase()
    : '';

  if (message.includes('timed out') || message.includes('timeout')) {
    return '调用超时，已切换为最小保底分析。';
  }

  if (message.includes('rate limit')) {
    return '调用触发限流，已切换为最小保底分析。';
  }

  return '调用暂时不可用，已切换为最小保底分析。';
}

function buildRoleFallback(
  role: ChallengeRole,
  reason: string,
  context: { idea: string; architect?: string; userConfirm: string; userResponse: string }
): string {
  const roleLabel = CHALLENGE_ROLE_LABELS[role];
  const framing = context.userConfirm || context.architect || context.idea;

  switch (role) {
    case 'architect':
      return [
        '## 系统降级说明',
        `本轮“${roleLabel}”${reason}`,
        '',
        '## 核心问题',
        `围绕“${context.idea}”是否存在一个稳定且值得优先解决的真实阻塞，仍需要进一步确认。`,
        '',
        '## 目标用户',
        '先聚焦最直接受影响的人，不要一开始扩大范围。',
        '',
        '## 当前痛点',
        '请补充最近一次卡住推进的真实案例，说明发生在哪一步、谁被影响、造成了什么损失。',
      ].join('\n');
    case 'assassin':
      return [
        '## 系统降级说明',
        `本轮“${roleLabel}”${reason}`,
        '',
        '## 当前质疑对象',
        framing,
        '',
        '## 最小反方质疑',
        '- 目前还缺少一个最近发生的具体案例，无法判断这是不是高频且高损失的问题。',
        '- 如果不先确认谁最受影响、在哪一步卡住、损失是什么，就容易把管理噪音误判成产品机会。',
        '- 最小验证动作：补充一次真实场景，写清参与角色、卡点、时间损失和当前替代做法。',
      ].join('\n');
    case 'userGhost':
      return [
        '## 系统降级说明',
        `本轮“${roleLabel}”${reason}`,
        '',
        '## 当前用户视角',
        framing,
        '',
        '## 最小用户质疑',
        '- 这件事到底在哪一步最痛？如果只是偶发抱怨，我不会因此改变习惯。',
        '- 你希望我多做哪些输入？如果维护成本更高，我可能继续用现有方式。',
        '- 我需要先看到一个能明显省时的最小版本，否则不会持续使用。',
      ].join('\n');
    case 'grounder':
      return [
        '## 系统降级说明',
        `本轮“${roleLabel}”${reason}`,
        '',
        '## 当前最强假设',
        '1. 当前讨论指向一个真实痛点，但还需要更多一线案例来确认优先级。',
        '',
        '## MVP边界',
        '- 先只验证最痛的一步和最小可用流程，不扩展成完整系统。',
        '',
        '## 本轮证伪检查',
        '当前最重要假设：这个痛点高频、持续，而且值得被一个新流程解决。',
        '如果我是错的：问题只是偶发噪音，或现有工具通过规范就能解决。',
        '最小动作：补一个最近一次真实案例，说明参与角色、卡点、时间损失和当前替代做法。',
      ].join('\n');
  }
}

async function callRoleWithFallback(
  adapter: LLMAdapter,
  role: ChallengeRole,
  userMessage: string,
  context: { idea: string; architect?: string; userConfirm: string; userResponse: string }
): Promise<string> {
  try {
    return await callRole(adapter, role, userMessage);
  } catch (error) {
    return buildRoleFallback(role, summarizeError(error), context);
  }
}

// ── Step 1: Architect framing ─────────────────────────────────────────────────
// Human checkpoint: user reads framing and corrects/confirms problem definition.

export async function runArchitectFraming(
  adapter: LLMAdapter,
  topic: string
): Promise<ArchitectFramingResult> {
  const architectMsg = `用户的产品想法：\n${topic}`;
  const architect = await callRoleWithFallback(adapter, 'architect', architectMsg, {
    idea: topic,
    userConfirm: '',
    userResponse: '',
  });
  return { architect };
}

// ── Step 2: Objection generation ──────────────────────────────────────────────
// Human checkpoint: user reads objections and decides how to respond.

export async function runObjectionGeneration(
  adapter: LLMAdapter,
  architect: string,
  userConfirm: string
): Promise<ObjectionGenerationResult> {
  const assassinMsg = `架构师的问题定义：\n${architect}\n\n用户确认/修正：\n${userConfirm}`;
  const userGhostMsg = `架构师的问题定义：\n${architect}\n\n用户确认/修正：\n${userConfirm}`;
  const [assassin, userGhost] = await Promise.all([
    callRoleWithFallback(adapter, 'assassin', assassinMsg, {
      idea: architect,
      architect,
      userConfirm,
      userResponse: '',
    }),
    callRoleWithFallback(adapter, 'userGhost', userGhostMsg, {
      idea: architect,
      architect,
      userConfirm,
      userResponse: '',
    }),
  ]);
  return { assassin, userGhost };
}

// ── Step 3: Grounding ─────────────────────────────────────────────────────────
// Human checkpoint: user reviews grounding summary and decides whether to
// continue with another round or move to decision mode.

export async function runGrounding(
  adapter: LLMAdapter,
  architect: string,
  userConfirm: string,
  assassin: string,
  userGhost: string,
  userResponse: string
): Promise<GroundingResult> {
  const grounderMsg = `架构师：${architect}\n用户确认：\n${userConfirm}\n刺客：\n${assassin}\n用户鬼：${userGhost}\n用户回应：\n${userResponse}`;
  let grounder = await callRoleWithFallback(adapter, 'grounder', grounderMsg, {
    idea: architect,
    architect,
    userConfirm,
    userResponse,
  });

  if (!validateFalsificationBlock(grounder)) {
    const retryMsg = `${grounderMsg}\n\n[系统提示] 你上一次输出缺少“本轮证伪检查”。请务必在末尾补全以下三行：当前最重要假设、如果我是错的、最小动作。`;
    grounder = await callRoleWithFallback(adapter, 'grounder', retryMsg, {
      idea: architect,
      architect,
      userConfirm,
      userResponse,
    });
  }

  const conflicts = detectConflicts(assassin, userGhost, grounder, userResponse);
  return { grounder, conflicts };
}

// ── Backward-compat full-round wrapper ────────────────────────────────────────
// @deprecated Use the three step functions for phase-gated flows.

export async function runChallengeRound(
  adapter: LLMAdapter,
  input: ChallengeInput,
  roundNumber: number
): Promise<ChallengeRound> {
  const { architect } = await runArchitectFraming(adapter, input.idea);
  const { assassin, userGhost } = await runObjectionGeneration(adapter, architect, input.userConfirm);
  const { grounder, conflicts } = await runGrounding(adapter, architect, input.userConfirm, assassin, userGhost, input.userResponse);

  return {
    round: roundNumber,
    architect,
    userConfirm: input.userConfirm,
    assassin,
    userGhost,
    userResponse: input.userResponse,
    grounder,
    conflicts,
  };
}

export function buildChallengeSummary(session: ChallengeSession): ChallengeSummary {
  const lastRound = session.rounds[session.rounds.length - 1];
  if (!lastRound) {
    return {
      hypotheses: [],
      mvpBoundary: '',
      conflicts: [],
      nextActions: [],
    };
  }

  const hypothesesMatch = lastRound.grounder.match(/##\s*(当前最强假设|Strongest Hypotheses|Hypotheses)[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  const hypotheses = hypothesesMatch?.[2]
    ? hypothesesMatch[2]
      .split('\n')
      .filter(l => l.trim().match(/^(\d+\.|-)\s+/))
      .map(l => l.replace(/^(\d+\.|-)\s*/, '').trim())
    : [];

  const mvpMatch = lastRound.grounder.match(/##\s*(MVP边界|MVP Boundary)[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  const mvpBoundary = mvpMatch?.[2] ? mvpMatch[2].trim() : '';

  const allConflicts = session.rounds.flatMap(r => r.conflicts ?? []);

  const nextActions = ['验证核心假设', '完成最小 MVP', '收集用户反馈'];

  return {
    hypotheses,
    mvpBoundary,
    conflicts: allConflicts,
    nextActions,
  };
}

import type { LLMAdapter } from '@prodmind/llm-adapter';
import type { ChallengeRole, ChallengeRound, ChallengeSession, ChallengeSummary } from '@prodmind/shared-types';
import { callRole, type RoleCallOptions } from './roles.js';
import { detectConflicts } from './rules.js';

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

function summarizeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown role failure';
}

function buildRoleFallback(
  role: ChallengeRole,
  reason: string,
  context: { idea: string; architect?: string; userConfirm: string; userResponse: string }
): string {
  const note = `system fallback: ${role} unavailable for this round (${reason})`;

  switch (role) {
    case 'architect':
      return [
        '## System fallback',
        note,
        '',
        '## Original idea',
        context.idea,
      ].join('\n');
    case 'assassin':
      return [
        '## System fallback',
        note,
        '',
        '## Temporary stance',
        'Counter-arguments were not generated in this round.',
      ].join('\n');
    case 'userGhost':
      return [
        '## System fallback',
        note,
        '',
        '## Temporary stance',
        'User objections were not generated in this round.',
      ].join('\n');
    case 'grounder':
      return [
        '## System fallback',
        note,
        '',
        '## Carry-forward',
        `Architect summary: ${context.architect ?? 'unavailable'}`,
        `Latest confirmation: ${context.userConfirm}`,
        `Latest response: ${context.userResponse}`,
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
  const grounder = await callRoleWithFallback(adapter, 'grounder', grounderMsg, {
    idea: architect,
    architect,
    userConfirm,
    userResponse,
  });
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

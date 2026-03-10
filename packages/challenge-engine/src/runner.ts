import type { LLMAdapter } from '@prodmind/llm-adapter';
import type { ChallengeSession, ChallengeRound, ChallengeSummary } from '@prodmind/shared-types';
import { callRole, type RoleCallOptions } from './roles.js';
import { detectConflicts } from './rules.js';

export type { RoleCallOptions };

export interface ChallengeInput {
  idea: string;
  userConfirm: string;
  userResponse: string;
}

export async function runChallengeRound(
  adapter: LLMAdapter,
  input: ChallengeInput,
  roundNumber: number
): Promise<ChallengeRound> {
  const architectMsg = `用户的产品想法：\n${input.idea}`;
  const architect = await callRole(adapter, 'architect', architectMsg);

  const assassinMsg = `架构师的问题定义：\n${architect}\n\n用户确认/修正：\n${input.userConfirm}`;
  const assassin = await callRole(adapter, 'assassin', assassinMsg);

  const userGhostMsg = `架构师的问题定义：\n${architect}\n\n用户确认/修正：\n${input.userConfirm}`;
  const userGhost = await callRole(adapter, 'userGhost', userGhostMsg);

  const grounderMsg = `架构师：${architect}\n用户确认：${input.userConfirm}\n刺客：${assassin}\n用户鬼：${userGhost}\n用户回应：${input.userResponse}`;
  const grounder = await callRole(adapter, 'grounder', grounderMsg);

  const conflicts = detectConflicts(assassin, userGhost, grounder, input.userResponse);

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

  const nextActions = ['验证核心假设', '完成最小MVP', '收集用户反馈'];

  return {
    hypotheses,
    mvpBoundary,
    conflicts: allConflicts,
    nextActions,
  };
}

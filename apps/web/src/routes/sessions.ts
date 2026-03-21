import { Router } from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import {
  runArchitectFraming,
  runGrounding,
  runObjectionGeneration,
} from '@prodmind/challenge-engine';
import {
  runDecisionFrameGeneration,
  runRecommendationSynthesis,
  runTradeoffAnalysis,
} from '@prodmind/decision-engine';
import { createSessionStore } from '@prodmind/asset-engine';
import type { ModeMessage, ModeState } from '@prodmind/shared-types';
import { ConversationModeSchema } from '@prodmind/shared-types';
import {
  appendLiveRoleMessages,
  appendLiveUserMessage,
  createLiveSession,
  getLiveSession,
  replaceLatestChallengeHandoff,
  replaceLiveModeState,
  switchLiveSessionMode,
  transitionSessionPhase,
  updateLiveSessionSharedContext,
} from '../state/session-store.js';
import { createChallengeAdapter, createDecisionAdapter } from './sessions/adapters.js';
import {
  buildChallengeHandoff,
  buildChallengeDraftSummary,
  buildProblemCorrectionAssistSuggestion,
  getInterruptTransition,
  resolveChallengeAction,
  validateChallengeDownstreamSwitch,
  validateChallengeTurnInput,
} from './sessions/challenge-helpers.js';
import {
  CHALLENGE_MAX_ROUNDS,
  CHALLENGE_ROLE_SET,
  DECISION_ROLE_SET,
  REQUIREMENT_ARTIFACT_LABELS,
  REQUIREMENT_ROLE_SET,
} from './sessions/constants.js';
import {
  buildDecisionFrameMessage,
  buildDecisionProblem,
  buildDecisionRecommendationMessage,
  buildTradeoffMessage,
  loadStoredDecisionFrame,
  loadStoredTradeoff,
  resolveDecisionAction,
  seedDecisionModeFromChallengeHandoff,
} from './sessions/decision-helpers.js';
import {
  buildRequirementDraftSummaryByArtifact,
  buildRequirementGoalMessage,
  buildRequirementProjectState,
  buildRequirementRoleMessage,
  chooseNextRequirementArtifact,
  finalizeRequirementArtifacts,
  loadModeArtifacts,
  mergeRequirementDraftArtifacts,
  parseRequirementArtifactType,
  resolveRequirementAction,
  seedRequirementModeFromChallengeHandoff,
  writeRequirementDraftArtifact,
} from './sessions/requirement-helpers.js';
import { buildSessionMarkdownExport } from './sessions/session-export.js';
import {
  buildReplayPayload,
  buildSessionHistoryView,
  buildSessionView,
} from './sessions/session-view.js';
import {
  appendSharedContextSummary,
  hasSharedContextPatch,
  parseSharedContextPatch,
} from './sessions/shared-context.js';

export const sessionsRouter: Router = Router();
const sessionPersistence = createSessionStore();

sessionsRouter.post('/', async (req: Request, res: Response) => {
  const { topic, projectPath = './prodmind-project' } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'topic required' });
  }

  const state = await createLiveSession(projectPath, topic);
  return res.status(201).json({
    session: buildSessionView(state),
    modeState: state.modeStates[state.session.currentMode] ?? null,
  });
});

sessionsRouter.get('/', async (req: Request, res: Response) => {
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  const sessions = await sessionPersistence.listSessions(projectPath);

  return res.json({
    sessions: await Promise.all(sessions.map((session) => buildSessionHistoryView(projectPath, session))),
  });
});

sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const state = await getLiveSession(projectPath, id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    session: buildSessionView(state),
    modeState: state.modeStates[state.session.currentMode] ?? null,
    artifacts: await loadModeArtifacts(projectPath, id, state.session.currentMode),
  });
});

sessionsRouter.get('/:id/replay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const replay = await buildReplayPayload(projectPath, id);
  if (!replay) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json(replay);
});

sessionsRouter.get('/:id/export.md', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const exported = await buildSessionMarkdownExport(projectPath, id);
  if (!exported) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.type('text/markdown; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="session-${id}.md"; filename*=UTF-8''${encodeURIComponent(exported.filename)}`,
  );
  return res.send(exported.content);
});

sessionsRouter.post('/:id/challenge/problem-correction-assist', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { projectPath = './prodmind-project', content = '' } = req.body ?? {};
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const state = await getLiveSession(projectPath, id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const input = String(content || '').trim();
  if (!input) {
    return res.status(400).json({ error: 'content required' });
  }

  return res.json(buildProblemCorrectionAssistSuggestion(state, input));
});

sessionsRouter.post('/:id/mode', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const parsed = ConversationModeSchema.safeParse(mode);
  if (!parsed.success) {
    return res.status(400).json({ error: 'valid mode required' });
  }

  const existing = await getLiveSession(projectPath, id);
  if (!existing) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const switchValidationError = validateChallengeDownstreamSwitch(existing.session, parsed.data);
  if (switchValidationError) {
    return res.status(409).json({ error: switchValidationError });
  }

  const state = await switchLiveSessionMode(projectPath, id, parsed.data);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  let finalState = state;
  if (parsed.data === 'decision') {
    const seeded = await seedDecisionModeFromChallengeHandoff(projectPath, id, state);
    if (!seeded) {
      return res.status(404).json({ error: 'Session not found' });
    }
    finalState = seeded;
  }
  if (parsed.data === 'requirement-build') {
    const seeded = await seedRequirementModeFromChallengeHandoff(projectPath, id, finalState);
    if (!seeded) {
      return res.status(404).json({ error: 'Session not found' });
    }
    finalState = seeded;
  }

  return res.json({
    session: buildSessionView(finalState),
    modeState: finalState.modeStates[finalState.session.currentMode] ?? null,
    artifacts: await loadModeArtifacts(projectPath, id, finalState.session.currentMode),
  });
});

sessionsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  const currentState = await getLiveSession(projectPath, id);
  if (!currentState) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const challengeAction = currentState.session.currentMode === 'challenge'
    ? resolveChallengeAction(
      (req.body as Record<string, string>).action,
      currentState.session.currentPhase,
    )
    : null;

  if (challengeAction) {
    const validation = validateChallengeTurnInput(
      currentState,
      challengeAction,
      String(content),
      typeof req.body.focusAction === 'string' ? req.body.focusAction : undefined,
    );
    if (validation) {
      return res.status(validation.status).json({ error: validation.error });
    }
  }

  const initialResult = await appendLiveUserMessage(projectPath, id, content);
  if (!initialResult) {
    return res.status(404).json({ error: 'Session not found' });
  }

  let result = initialResult;
  const sharedContextPatch = parseSharedContextPatch(content);
  if (hasSharedContextPatch(sharedContextPatch)) {
    const updatedSharedContext = await updateLiveSessionSharedContext(projectPath, id, sharedContextPatch);
    if (!updatedSharedContext) {
      return res.status(404).json({ error: 'Session not found' });
    }

    result = {
      ...result,
      state: updatedSharedContext.state,
    };
  }

  if (result.state.session.currentMode !== 'challenge') {
    if (result.state.session.currentMode === 'decision') {
      try {
        const decisionAction = resolveDecisionAction(
          (req.body as Record<string, string>).action,
          result.state.session.currentPhase,
        );
        const adapter = createDecisionAdapter();

        if (decisionAction === 'decision_problem') {
          const frame = await runDecisionFrameGeneration(adapter, buildDecisionProblem(result.state.session, content));
          await sessionPersistence.saveDraftArtifact(projectPath, id, 'decision', 'frame', frame);

          const updated = await appendLiveRoleMessages(projectPath, id, [buildDecisionFrameMessage(frame)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary(
                '决策框架已生成，等待你确认或修正。',
                result.state.session.sharedContext,
              ),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(projectPath, id, 'waiting_user_frame_confirmation', '请确认或修正决策框架。', '决策框架已生成');

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        if (decisionAction === 'frame_correction') {
          const frame = await loadStoredDecisionFrame(projectPath, id);
          if (!frame) {
            return res.status(400).json({ error: 'decision frame missing; start with action=decision_problem' });
          }

          const tradeoff = await runTradeoffAnalysis(adapter, frame, content);
          await sessionPersistence.saveDraftArtifact(projectPath, id, 'decision', 'tradeoff', tradeoff);

          const updated = await appendLiveRoleMessages(projectPath, id, [buildTradeoffMessage(tradeoff)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary('权衡分析已生成，等待你调整优先级。', result.state.session.sharedContext),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(projectPath, id, 'waiting_user_priority_adjustment', '请先调整优先级或权重，再进入推荐结论。', '权衡分析已完成');

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        if (decisionAction === 'priority_adjustment') {
          const frame = await loadStoredDecisionFrame(projectPath, id);
          const tradeoff = await loadStoredTradeoff(projectPath, id);
          if (!frame || !tradeoff) {
            return res.status(400).json({ error: 'decision frame/tradeoff missing; complete earlier steps first' });
          }

          const recommendation = await runRecommendationSynthesis(adapter, frame, tradeoff);
          const updated = await appendLiveRoleMessages(projectPath, id, [buildDecisionRecommendationMessage(recommendation)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary(recommendation, result.state.session.sharedContext),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(projectPath, id, 'waiting_decision_resolution', '请审阅推荐结论，然后决定收束本模式还是切换模式。', '推荐结论已生成', 'requirement-build');

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        await transitionSessionPhase(projectPath, id, 'decision_prompt_submitted', '请输入下一个决策问题，或切换模式。', '已记录决策结论');

        const finalState = await getLiveSession(projectPath, id);
        return res.status(200).json({
          session: buildSessionView(finalState!),
          modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Decision turn failed',
        });
      }
    }

    if (result.state.session.currentMode === 'requirement-build') {
      try {
        const modeState = result.state.modeStates['requirement-build'];
        if (!modeState) {
          return res.status(404).json({ error: 'Mode state not found' });
        }

        const requirementAction = resolveRequirementAction(
          (req.body as Record<string, string>).action,
          result.state.session.currentPhase,
        );
        const draftDir = path.join(projectPath, '.prodmind', 'sessions', id, 'workspace', 'requirement-build', 'draft');

        if (requirementAction === 'artifact_goal') {
          const suggestedArtifact = parseRequirementArtifactType(content) ?? chooseNextRequirementArtifact(modeState.draftArtifacts);
          const goalMessage = buildRequirementGoalMessage(suggestedArtifact);
          const updated = await appendLiveRoleMessages(projectPath, id, [goalMessage], {
            roleSet: REQUIREMENT_ROLE_SET,
            draftSummary: { summary: '已记录产物目标，等待你选择要推进的产物层级。', updatedAt: new Date().toISOString() },
          });
          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(projectPath, id, 'waiting_user_artifact_selection', '请选择要推进的产物层级：想法、规格、验收或任务。', '已记录产物目标');

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, 'requirement-build'),
          });
        }

        if (requirementAction === 'finalization_note') {
          const finalized = await finalizeRequirementArtifacts(projectPath, id, content);
          if ('error' in finalized) {
            return res.status(finalized.status ?? 500).json({ error: finalized.error });
          }

          await transitionSessionPhase(projectPath, id, 'artifact_finalized', '你可以继续发起新的产物目标，或切换模式。', '已完成产物定稿');

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: finalized.artifacts,
          });
        }

        const explicitArtifact = parseRequirementArtifactType(content);
        const artifactType = requirementAction === 'artifact_selection'
          ? explicitArtifact
          : explicitArtifact ?? parseRequirementArtifactType(modeState.draftArtifacts[modeState.draftArtifacts.length - 1] ?? '');
        if (!artifactType) {
          return res.status(400).json({ error: '请选择要推进的草稿层级：想法、规格、验收或任务。' });
        }

        const projectState = buildRequirementProjectState(result.state.session, modeState, content);
        const draft = await writeRequirementDraftArtifact(draftDir, projectState, artifactType);
        await sessionPersistence.saveDraftArtifact(projectPath, id, 'requirement-build', artifactType, draft);

        const roleMessage = buildRequirementRoleMessage(
          artifactType,
          draft,
          requirementAction === 'artifact_selection' ? 'selection' : 'revision',
        );
        const updatedModeState: ModeState = {
          ...modeState,
          roleSet: REQUIREMENT_ROLE_SET,
          messages: [...modeState.messages, roleMessage],
          draftSummary: {
            summary: buildRequirementDraftSummaryByArtifact(artifactType, draft, requirementAction === 'artifact_selection' ? 'selection' : 'revision'),
            updatedAt: new Date().toISOString(),
          },
          draftArtifacts: mergeRequirementDraftArtifacts(modeState.draftArtifacts, artifactType),
          finalArtifacts: modeState.finalArtifacts,
        };

        const updated = await replaceLiveModeState(projectPath, id, updatedModeState);
        if (!updated) {
          return res.status(404).json({ error: 'Session not found' });
        }

        await sessionPersistence.appendEvent(projectPath, {
          type: 'role_message',
          eventId: `${id}-requirement-role-${artifactType}-${Date.now()}`,
          sessionId: id,
          mode: 'requirement-build',
          timestamp: roleMessage.timestamp,
          roleId: roleMessage.roleId ?? 'unknown',
          roleName: roleMessage.roleName ?? 'system',
          content: roleMessage.content,
        });
        await sessionPersistence.appendEvent(projectPath, {
          type: 'draft_updated',
          eventId: `${id}-requirement-draft-${artifactType}-${Date.now()}`,
          sessionId: id,
          mode: 'requirement-build',
          timestamp: new Date().toISOString(),
          summary: updatedModeState.draftSummary?.summary ?? '',
        });

        await transitionSessionPhase(
          projectPath,
          id,
          requirementAction === 'artifact_selection' ? 'waiting_user_draft_revision' : 'ready_for_downstream_or_finalize',
          requirementAction === 'artifact_selection' ? '请先审阅草稿，再决定是否继续修订。' : '你可以继续修订草稿，或直接补充定稿备注。',
          requirementAction === 'artifact_selection' ? `已生成${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿` : `已更新${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿`,
        );

        const finalState = await getLiveSession(projectPath, id);
        return res.status(200).json({
          session: buildSessionView(finalState!),
          modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, 'requirement-build'),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Requirement build turn failed',
        });
      }
    }

    return res.status(202).json({
      session: buildSessionView(result.state),
      modeState: result.state.modeStates[result.state.session.currentMode] ?? null,
      event: result.event,
    });
  }

  const action = challengeAction ?? resolveChallengeAction(
    (req.body as Record<string, string>).action,
    result.state.session.currentPhase,
  );
  const adapter = createChallengeAdapter();

  try {
    if (action === 'raw_topic') {
      const topic = [result.state.session.topic, content].filter(Boolean).join('\n');
      const { architect } = await runArchitectFraming(adapter, topic);
      const architectMessage: ModeMessage = {
        speaker: 'role',
        roleId: 'architect',
        roleName: '架构师',
        content: architect,
        timestamp: new Date().toISOString(),
      };
      const updated = await appendLiveRoleMessages(projectPath, id, [architectMessage], { roleSet: CHALLENGE_ROLE_SET });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await transitionSessionPhase(projectPath, id, 'waiting_user_problem_correction', '请确认或修正问题定义。', '架构师已完成问题定义');

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'problem_correction') {
      const challengeState = result.state.modeStates.challenge;
      const architectMessage = challengeState?.messages.find((message) => message.speaker === 'role' && message.roleId === 'architect');
      const architect = architectMessage?.content ?? result.state.session.topic;
      const { assassin, userGhost } = await runObjectionGeneration(adapter, architect, content);
      const timestamp = new Date().toISOString();
      const roleMessages: ModeMessage[] = [
        { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: assassin, timestamp },
        { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: userGhost, timestamp },
      ];
      const updated = await appendLiveRoleMessages(projectPath, id, roleMessages, { roleSet: CHALLENGE_ROLE_SET });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await transitionSessionPhase(projectPath, id, 'waiting_user_objection_response', '请直接回应当前轮中的关键质疑。', '反方质疑已生成');

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'objection_response') {
      const challengeState = result.state.modeStates.challenge;
      const messages = challengeState?.messages ?? [];
      const architect = messages.find((message) => message.roleId === 'architect')?.content ?? result.state.session.topic;
      const assassin = messages.find((message) => message.roleId === 'assassin')?.content ?? '';
      const userGhost = messages.find((message) => message.roleId === 'userGhost')?.content ?? '';
      const userMessages = messages.filter((message) => message.speaker === 'user');
      const userConfirm = userMessages.at(-2)?.content ?? userMessages.at(-1)?.content ?? '';
      const { grounder, conflicts } = await runGrounding(adapter, architect, userConfirm, assassin, userGhost, content);
      const grounderMessage: ModeMessage = {
        speaker: 'role',
        roleId: 'grounder',
        roleName: '锚点官',
        content: grounder,
        timestamp: new Date().toISOString(),
      };

      const completedRoundCount = messages.filter((message) => message.speaker === 'role' && message.roleId === 'grounder').length + 1;
      const roundRoleMessages = [...messages.filter((message) => message.speaker === 'role'), grounderMessage];
      const draftSummary = {
        summary: buildChallengeDraftSummary(completedRoundCount, roundRoleMessages, conflicts?.length ?? 0),
        updatedAt: new Date().toISOString(),
      };

      const updated = await appendLiveRoleMessages(projectPath, id, [grounderMessage], { roleSet: CHALLENGE_ROLE_SET, draftSummary });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const interruptTransition = getInterruptTransition(conflicts);
      if (interruptTransition) {
        await transitionSessionPhase(projectPath, id, interruptTransition.phase, interruptTransition.requiredUserAction, interruptTransition.lastCompletedStep);
      } else {
        const handoff = buildChallengeHandoff(
          updated.state.session,
          updated.state.modeStates.challenge?.messages ?? [],
          conflicts,
          completedRoundCount,
        );
        const handoffUpdated = await replaceLatestChallengeHandoff(projectPath, id, handoff);
        if (!handoffUpdated) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const roundDecisionMessage = completedRoundCount >= CHALLENGE_MAX_ROUNDS
          ? `已达到质疑模式最大 ${CHALLENGE_MAX_ROUNDS} 轮，请改为切换模式或回看本轮结论。`
          : '本轮已完成。你可以进入下一轮追问，或切换到其他模式。';
        const lastStep = completedRoundCount >= CHALLENGE_MAX_ROUNDS ? '已达到最大轮次' : '本轮收束已完成';

        await transitionSessionPhase(
          projectPath,
          id,
          'waiting_round_decision',
          roundDecisionMessage,
          lastStep,
          handoff.roundStatus.matureEnoughForRequirementBuild ? 'requirement-build' : 'decision',
        );
      }

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        conflicts,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'round_resolution') {
      await transitionSessionPhase(projectPath, id, 'topic_submitted', '请输入下一轮要继续验证的追问、反例或修正；仍在当前会话里，不会新建会话。', '已初始化下一轮');

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    return res.status(400).json({ error: `Unknown challenge action: ${action}` });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Unknown error during challenge processing',
    });
  }
});

sessionsRouter.post('/:id/artifacts/finalize', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { projectPath = './prodmind-project', note } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const finalized = await finalizeRequirementArtifacts(projectPath, id, note);
  if ('error' in finalized) {
    return res.status(finalized.status ?? 500).json({ error: finalized.error });
  }

  await transitionSessionPhase(projectPath, id, 'artifact_finalized', '你可以继续发起新的产物目标，或切换模式。', '已完成产物定稿');

  const finalState = await getLiveSession(projectPath, id);

  return res.status(200).json({
    session: buildSessionView(finalState ?? finalized.updated),
    modeState: (finalState ?? finalized.updated).modeStates[(finalState ?? finalized.updated).session.currentMode] ?? null,
    artifacts: finalized.artifacts,
  });
});

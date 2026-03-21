import { describe, expect, it } from 'vitest';
import {
  ArtifactVersionSchema,
  ChallengeHandoffSchema,
  ConversationEventSchema,
  ConversationModeSchema,
  ConversationSessionSchema,
  LegacyWorkflowResultSchema,
  LegacyWorkflowRunSchema,
  ModeStateSchema,
} from '../src/index.js';

describe('Conversation Session Contracts', () => {
  it('validates the supported conversation modes', () => {
    expect(ConversationModeSchema.parse('challenge')).toBe('challenge');
    expect(ConversationModeSchema.parse('decision')).toBe('decision');
    expect(ConversationModeSchema.parse('requirement-build')).toBe('requirement-build');
  });

  it('validates a conversation session with shared context', () => {
    const session = ConversationSessionSchema.parse({
      sessionId: 'session-1',
      topic: 'How should we design an internal thinking tool?',
      status: 'active',
      currentMode: 'challenge',
      sharedContext: {
        hardConstraints: ['No collaboration in V1'],
        confirmedFacts: ['Web is the primary entry point'],
        sourceReferences: ['repo-analysis'],
      },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:01.000Z',
      lastActiveAt: '2026-03-10T00:00:02.000Z',
    });

    expect(session.currentMode).toBe('challenge');
    expect(session.sharedContext.confirmedFacts).toContain('Web is the primary entry point');
  });

  it('validates a structured challenge handoff on the session', () => {
    const session = ConversationSessionSchema.parse({
      sessionId: 'session-2',
      topic: 'Should we build a demand intake system?',
      status: 'active',
      currentMode: 'challenge',
      latestChallengeHandoff: {
        roundIndex: 1,
        topic: 'Should we build a demand intake system?',
        problemFrame: {
          oneSentenceProblem: 'Demand signals are scattered across chat, docs, and meetings.',
          boundaries: ['Focus on intake before execution workflows'],
          keyVariables: ['signal quality', 'triage speed'],
        },
        userConfirmedContext: {
          scenario: 'A small cross-functional product team',
          topPains: ['messages are fragmented', 'priority is unstable', 'decisions are easy to lose'],
          constraints: ['must validate value in two weeks'],
        },
        strongestCounterHypothesis: 'The real issue may be team discipline, not missing software.',
        adoptionRisks: ['People may keep using chat as the real system of record.'],
        mvpScope: {
          include: ['intake form', 'triage board'],
          exclude: ['execution tracking'],
          oneWeekScope: ['collect and review incoming requests'],
        },
        openConflicts: ['Whether intake or prioritization should ship first.'],
        nextValidationActions: ['Interview three frontline request owners.'],
        evidenceTrace: {
          architectMessageId: 'architect-1',
          grounderMessageId: 'grounder-1',
        },
        roundStatus: {
          matureEnoughForDecision: true,
          matureEnoughForRequirementBuild: false,
        },
      },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:01.000Z',
      lastActiveAt: '2026-03-10T00:00:02.000Z',
    });

    expect(session.latestChallengeHandoff?.problemFrame.oneSentenceProblem).toContain('Demand signals');
    expect(session.latestChallengeHandoff?.roundStatus.matureEnoughForDecision).toBe(true);
  });

  it('validates timeline events for user messages and mode switches', () => {
    const userMessage = ConversationEventSchema.parse({
      type: 'user_message',
      eventId: 'event-1',
      sessionId: 'session-1',
      mode: 'challenge',
      timestamp: '2026-03-10T00:00:00.000Z',
      content: 'Let us pressure-test this product direction.',
    });

    const modeSwitch = ConversationEventSchema.parse({
      type: 'mode_switched',
      eventId: 'event-2',
      sessionId: 'session-1',
      mode: 'decision',
      timestamp: '2026-03-10T00:00:05.000Z',
      fromMode: 'challenge',
      toMode: 'decision',
    });

    expect(userMessage.type).toBe('user_message');
    expect(modeSwitch.toMode).toBe('decision');
  });

  it('validates the standalone challenge handoff schema', () => {
    const handoff = ChallengeHandoffSchema.parse({
      roundIndex: 2,
      topic: 'How should we scope an MVP?',
      problemFrame: {
        oneSentenceProblem: 'The team lacks a way to converge on a usable MVP boundary.',
      },
      userConfirmedContext: {
        scenario: 'A web-first internal tool team',
        topPains: ['scope creep'],
      },
      strongestCounterHypothesis: 'Maybe the team does not need a product, only a stricter ritual.',
      mvpScope: {
        include: ['boundary definition'],
      },
      roundStatus: {
        matureEnoughForDecision: true,
        matureEnoughForRequirementBuild: false,
      },
    });

    expect(handoff.problemFrame.boundaries).toEqual([]);
    expect(handoff.mvpScope.exclude).toEqual([]);
    expect(handoff.evidenceTrace).toEqual({});
  });

  it('validates mode-local state with roles and draft summary', () => {
    const state = ModeStateSchema.parse({
      mode: 'requirement-build',
      roleSet: [
        { roleId: 'req-designer', roleName: '需求师' },
        { roleId: 'acceptance-reviewer', roleName: '验收官' },
      ],
      messages: [
        {
          speaker: 'user',
          content: 'Turn this into executable requirements.',
          timestamp: '2026-03-10T00:00:00.000Z',
        },
      ],
      draftSummary: {
        summary: 'Draft spec exists and acceptance points need refinement.',
        updatedAt: '2026-03-10T00:00:10.000Z',
      },
      draftArtifacts: ['spec'],
      finalArtifacts: ['spec-v1'],
    });

    expect(state.mode).toBe('requirement-build');
    expect(state.roleSet).toHaveLength(2);
    expect(state.draftArtifacts).toContain('spec');
  });

  it('validates finalized artifact versions', () => {
    const artifact = ArtifactVersionSchema.parse({
      artifactId: 'artifact-1',
      sourceMode: 'requirement-build',
      artifactType: 'spec',
      version: 2,
      content: {
        title: 'Spec v2',
      },
      finalizedAt: '2026-03-10T00:00:20.000Z',
      note: 'Refined acceptance boundaries',
    });

    expect(artifact.version).toBe(2);
    expect(artifact.sourceMode).toBe('requirement-build');
  });

  it('keeps legacy workflow contracts available during migration', () => {
    const run = LegacyWorkflowRunSchema.parse({
      runId: 'run-1',
      idea: 'legacy workflow run',
      status: 'completed',
      startedAt: '2026-03-10T00:00:00.000Z',
      phases: [{ phase: 'challenge', status: 'completed' }],
    });

    const result = LegacyWorkflowResultSchema.parse({
      runId: 'run-1',
      decision: {
        artifactPath: 'assets/decision.json',
        recommendation: 'Keep compatibility while session semantics land.',
      },
    });

    expect(run.runId).toBe('run-1');
    expect(result.decision?.recommendation).toContain('compatibility');
  });
});

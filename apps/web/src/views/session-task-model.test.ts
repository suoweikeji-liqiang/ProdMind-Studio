import { describe, expect, it } from 'vitest';
import { buildSessionTaskModel } from './session-task-model.js';

describe('buildSessionTaskModel', () => {
  it('maps waiting_user_problem_correction to a single primary correction action', () => {
    const model = buildSessionTaskModel(
      {
        currentMode: 'challenge',
        currentPhase: 'waiting_user_problem_correction',
        interactionState: 'waiting_user_input',
        requiredUserAction: '请确认或修正问题定义。',
        nextRecommendedMode: undefined,
        recommendedRollbackMode: undefined,
      },
      { drafts: {}, finalized: {} },
    );

    expect(model.headline).toBe('请确认或修正问题定义。');
    expect(model.primaryInputAction).toBe('problem_correction');
    expect(model.primaryButtonLabel).toBe('提交问题修正');
    expect(model.explicitChoices).toEqual([]);
  });

  it('maps waiting_user_artifact_selection to explicit artifact buttons instead of free-form guessing', () => {
    const model = buildSessionTaskModel(
      {
        currentMode: 'requirement-build',
        currentPhase: 'waiting_user_artifact_selection',
        interactionState: 'waiting_user_input',
        requiredUserAction: '请选择要推进的产物层级：idea、spec、acceptance 或 tasks。',
      },
      { drafts: {}, finalized: {} },
    );

    expect(model.primaryInputAction).toBeNull();
    expect(model.primaryButtonLabel).toBeNull();
    expect(model.explicitChoices.map((item) => item.actionValue)).toEqual([
      'idea',
      'spec',
      'acceptance',
      'tasks',
    ]);
    expect(model.showModeSwitcher).toBe(false);
  });
});

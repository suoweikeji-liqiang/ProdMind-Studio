import { describe, expect, it } from 'vitest';
import {
  buildProblemCorrectionChecklist,
  createEmptyProblemCorrectionDraft,
  serializeProblemCorrectionDraft,
} from './problem-correction-form.js';

describe('problem-correction-form', () => {
  it('serializes the structured draft into the stable text format consumed by challenge', () => {
    const draft = {
      problemDefinition: '反馈无法被持续记录和闭环，导致判断依据不断丢失。',
      scenario: '暖通智能运维公司的内部协作场景。',
      topPains: [
        '缺少有记录的反馈通道。',
        '缺少对提问者和解决者的激励。',
        '缺少把问题转成产品并验收的路径。',
      ],
      constraints: ['单人开发，两周完成。'],
      notes: '先聚焦内部团队，不碰外部协同。',
    };

    expect(serializeProblemCorrectionDraft(draft)).toBe([
      '问题定义：反馈无法被持续记录和闭环，导致判断依据不断丢失。',
      '场景：暖通智能运维公司的内部协作场景。',
      '核心痛点：',
      '- 缺少有记录的反馈通道。',
      '- 缺少对提问者和解决者的激励。',
      '- 缺少把问题转成产品并验收的路径。',
      '约束：',
      '- 单人开发，两周完成。',
      '补充说明：',
      '先聚焦内部团队，不碰外部协同。',
    ].join('\n'));
  });

  it('marks problem correction checklist items as satisfied from the structured draft', () => {
    const draft = createEmptyProblemCorrectionDraft();
    draft.problemDefinition = '反馈无法被持续记录和闭环，导致判断依据不断丢失。';
    draft.scenario = '暖通智能运维公司的内部协作场景。';
    draft.topPains = [
      '缺少有记录的反馈通道。',
      '缺少对提问者和解决者的激励。',
      '缺少把问题转成产品并验收的路径。',
    ];
    draft.constraints = ['单人开发，两周完成。'];

    expect(buildProblemCorrectionChecklist(draft).map((item) => item.done)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});

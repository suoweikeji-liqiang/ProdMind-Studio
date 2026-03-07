import { describe, it, expect } from 'vitest';
import { detectAlternativeHypothesis, detectConsensusAlert, detectTechEscape, validateFalsificationBlock } from './rules.js';

describe('Challenge Rules', () => {
  describe('detectAlternativeHypothesis', () => {
    it('detects Chinese alternative hypothesis', () => {
      const response = '可能不是需求问题，而是管理问题。';
      const result = detectAlternativeHypothesis(response, 'assassin');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('assassin');
      expect(result?.content).toContain('管理问题');
    });

    it('detects English alternative hypothesis', () => {
      const response = 'This is not about technology, but about user behavior.';
      const result = detectAlternativeHypothesis(response, 'userGhost');

      expect(result).not.toBeNull();
      expect(result?.content).toContain('user behavior');
    });

    it('returns null when no alternative found', () => {
      const response = '这个方案很好。';
      const result = detectAlternativeHypothesis(response, 'assassin');

      expect(result).toBeNull();
    });
  });

  describe('detectConsensusAlert', () => {
    it('detects consensus when both roles agree', () => {
      const assassin = '同意这个方案，没问题。';
      const userGhost = '看起来合理，我也同意。';

      expect(detectConsensusAlert(assassin, userGhost)).toBe(true);
    });

    it('does not trigger when roles attack', () => {
      const assassin = '但是这个方案有问题，不对。';
      const userGhost = '然而用户不会买单。';

      expect(detectConsensusAlert(assassin, userGhost)).toBe(false);
    });
  });

  describe('detectTechEscape', () => {
    it('detects tech escape patterns', () => {
      const response = 'AI可以加速开发周期，技术不是问题，成本趋近于零。';

      expect(detectTechEscape(response)).toBe(true);
    });

    it('does not trigger on single mention', () => {
      const response = 'AI可以帮助，但需求验证更重要。';

      expect(detectTechEscape(response)).toBe(false);
    });
  });

  describe('validateFalsificationBlock', () => {
    it('validates complete falsification block', () => {
      const grounder = `## 本轮证伪检查
当前最重要假设：用户需要这个功能
如果我是错的，最可能因为什么？需求不真实
验证这个假设的最小动作是什么？用户访谈`;

      expect(validateFalsificationBlock(grounder)).toBe(true);
    });

    it('fails when falsification block incomplete', () => {
      const grounder = '## MVP边界\n包含基础功能';

      expect(validateFalsificationBlock(grounder)).toBe(false);
    });
  });
});

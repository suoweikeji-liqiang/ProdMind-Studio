import type { AlternativeHypothesis, ChallengeConflict } from '@prodmind/shared-types';

const ALT_PATTERNS = [
  /可能不是(.+?)[，,]而是(.+?)(?:[。.！!？?\n]|$)/,
  /更底层的问题是[：:]?\s*(.+?)(?:[。.！!？?\n]|$)/,
  /真正的问题可能是[：:]?\s*(.+?)(?:[。.！!？?\n]|$)/,
  /not about (.+?), but (?:about )?(.+?)(?:[.\n]|$)/i,
  /the real problem is (.+?)(?:[.\n]|$)/i,
];

export function detectAlternativeHypothesis(
  response: string,
  source: string
): AlternativeHypothesis | null {
  for (const pattern of ALT_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      const content = match[2]?.trim() || match[1]?.trim() || '';
      if (content.length > 2) {
        return { source, content };
      }
    }
  }
  return null;
}

const AGREE_KEYWORDS = ['同意', '没问题', '合理', '正确', 'agree', 'looks good', 'makes sense'];
const ATTACK_KEYWORDS = ['但是', '然而', '问题在于', '不对', '错', '反对', 'however', 'but', 'wrong', 'disagree'];

function isWeakResponse(response: string): boolean {
  const lower = response.toLowerCase();
  const hasAgree = AGREE_KEYWORDS.some(kw => lower.includes(kw));
  const hasAttack = ATTACK_KEYWORDS.some(kw => lower.includes(kw));
  return hasAgree && !hasAttack;
}

export function detectConsensusAlert(
  assassinResponse: string,
  userGhostResponse: string
): boolean {
  return isWeakResponse(assassinResponse) && isWeakResponse(userGhostResponse);
}

const TECH_ESCAPE_PATTERNS = [
  /AI.{0,10}(?:缩短|加速|提升|降低).{0,10}(?:周期|效率|质量|成本)/,
  /技术.{0,10}(?:不是问题|已经成熟|可以解决)/,
  /AI.{0,10}(?:accelerat|speed|reduc|lower).{0,10}(?:cost|cycle|time)/i,
];

export function detectTechEscape(userResponse: string): boolean {
  const matchCount = TECH_ESCAPE_PATTERNS.filter(p => p.test(userResponse)).length;
  return matchCount >= 2;
}

export function validateFalsificationBlock(grounderOutput: string): boolean {
  const required = [
    /当前最重要假设/,
    /如果我是错的/,
    /最小动作/,
  ];
  return required.every(p => p.test(grounderOutput));
}

export function detectConflicts(
  assassinResponse: string,
  userGhostResponse: string,
  grounderOutput: string,
  userResponse: string
): ChallengeConflict[] {
  const conflicts: ChallengeConflict[] = [];

  const altFromAssassin = detectAlternativeHypothesis(assassinResponse, 'assassin');
  const altFromGhost = detectAlternativeHypothesis(userGhostResponse, 'userGhost');
  if (altFromAssassin || altFromGhost) {
    conflicts.push({
      type: 'alternative_hypothesis',
      detected: true,
      details: (altFromAssassin || altFromGhost)?.content,
    });
  }

  if (detectConsensusAlert(assassinResponse, userGhostResponse)) {
    conflicts.push({
      type: 'consensus_alert',
      detected: true,
    });
  }

  if (detectTechEscape(userResponse)) {
    conflicts.push({
      type: 'tech_escape',
      detected: true,
    });
  }

  if (!validateFalsificationBlock(grounderOutput)) {
    conflicts.push({
      type: 'falsification_missing',
      detected: true,
    });
  }

  return conflicts;
}

export { runChallengeRound, runArchitectFraming, runObjectionGeneration, runGrounding, buildChallengeSummary } from './runner.js';
export { getRoleConfig, callRole } from './roles.js';
export { detectAlternativeHypothesis, detectConsensusAlert, detectTechEscape, validateFalsificationBlock, detectConflicts } from './rules.js';
export { createSession, appendRound, shouldContinue, updateStatus } from './session.js';
export { evaluateConvergence } from './convergence.js';
export type { RoleCallOptions, ChallengeInput, ArchitectFramingResult, ObjectionGenerationResult, GroundingResult } from './runner.js';
export type { RoleConfig } from './roles.js';
export type { ConvergenceResult } from './convergence.js';

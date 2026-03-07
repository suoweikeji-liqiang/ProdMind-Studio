# Phase 1 Shared Types Plan

## 目标
在 Phase 1 先把“资产沉淀链路必需”的公共类型统一到 `packages/shared-types`，并为后续 `challenge-engine` / `decision-engine` 预留稳定接口。

## 来源依据（已扫描）
- `requirement-co-builder/src/state/schema.ts`
- `requirement-co-builder/src/output/{compile.ts,artifacts.ts}`
- `prodmind-v1/prodmind-web/src/types/index.ts`
- `prodmind-v2/prodmind2-cli/src/storage.ts`
- `prodmind-v2/prodmind2-web/src/lib/engine/debate.ts`

## 类型分层

## A. Asset 类型（Phase 1 主优先）

### 建议类型
- `AssetProjectId`
- `ClarityStage` (`concept | direction | structure | executable`)
- `AssetMessage` (`role`, `content`, `timestamp`)
- `FiveDimensionProjection` (`context/actors/intent/mechanism/boundary`)
- `CompressionSnapshot` (`oneLiner`, `threeLiner`, `structured`)
- `AssetProjectState`
- `SnapshotMeta`
- `ResearchEntry` (`note` / `link`)
- `ArtifactBundle` (`spec`, `acceptance`, `tasks`)

### 优先落位
- `P0`：全部进入 `packages/shared-types`（因为 `asset-engine` Phase 1 即落地）。

## B. Challenge 类型（Phase 1 只放“桥接最小集”）

### 建议类型
- `ChallengeRoleName`（architect/assassin/user_ghost/grounder/user/system）
- `ChallengeConflictRuleType`
- `ChallengeRoundSummary`（最小轮次摘要）
- `ChallengeConclusion`（供资产引擎沉淀的结果）

### 不在 Phase 1 强行统一
- 完整 `DebateAction` / `SSEEvent` / Web DB 行模型先不全量迁入。
- 理由：Phase 1 不迁 challenge 业务实现，只保留跨引擎沉淀接口。

### 优先落位
- `P1`：`ChallengeRoleName`、`ChallengeConflictRuleType`、`ChallengeConclusion`。
- `P2`：完整 challenge 会话细粒度事件类型。

## C. Decision 类型（Phase 1 放状态骨架，不放调度细节）

### 建议类型
- `DecisionAgentName`
- `DecisionProblemDefinition`
- `DecisionAssumption`
- `DecisionRisk`
- `DecisionSimulationPath`
- `DecisionStateTree`
- `DecisionSnapshot`
- `DecisionConfidence`

### 不在 Phase 1 强行统一
- `runDebateRound` 的完整流事件协议（保留到 Phase 3 统一）。

### 优先落位
- `P1`：`DecisionStateTree` 相关核心结构（为后续资产沉淀做输入规范）。
- `P2`：decision 引擎内部事件流类型。

## D. Cross-Engine Event 类型（Phase 1 必须最小闭环）

### 建议类型
- `EngineName` (`challenge | decision | asset`)
- `EventId` / `ProjectId` / `SessionId`
- `EngineEventEnvelope<TPayload>`:
  - `id`
  - `engine`
  - `eventType`
  - `occurredAt`
  - `projectId?`
  - `sessionId?`
  - `payload`
- `AssetIngestEvent`（资产引擎统一入口事件）

### 优先落位
- `P0`：`EngineEventEnvelope`、`AssetIngestEvent`、基础 ID 类型别名。

## Phase 1 落地清单（shared-types 内必须先有）
- `asset/*`：完整 P0 资产类型。
- `cross-engine/*`：`EngineEventEnvelope` + `AssetIngestEvent`。
- `common/*`：ID 类型、时间戳、错误基础结构。
- `challenge/*`：仅最小桥接类型。
- `decision/*`：仅状态树骨架类型。

## 建议目录（shared-types）
- `src/common.ts`
- `src/asset.ts`
- `src/challenge.ts`
- `src/decision.ts`
- `src/events.ts`
- `src/index.ts`（统一导出）


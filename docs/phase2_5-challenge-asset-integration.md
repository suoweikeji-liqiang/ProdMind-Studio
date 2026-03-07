# Phase 2.5: Challenge-Asset Integration

## 目标

在 Phase 2 和 Phase 3 之间插入最小集成层，打通 challenge-engine 和 asset-engine，避免后续 contract 频繁改动。

## 完成内容

### ISSUE 1: Challenge-to-Asset Handoff Contract

**实现内容：**
- `ChallengeArtifact`: 结构化 challenge 输出
- `ChallengeToAssetHandoff`: 正式 handoff contract
- `Hypothesis`, `FalsificationCheck`, `NextAction`: 细粒度类型

**字段说明：**
- Required: sessionId, idea, hypotheses, mvpBoundary, conflicts, falsificationChecks, nextActions, roundCount, createdAt
- Optional: projectId, source (in Hypothesis), timeframe (in NextAction)
- Derived: metadata (converged, totalRounds, unresolvedConflicts)

**为什么足以支撑 Phase 3：**
- 结构化输出，不依赖自由文本解析
- 明确的优先级和时间框架
- 可扩展的 metadata 字段
- 与 decision-engine 输出可并行存在

### ISSUE 2: Multi-Round Session State

**实现内容：**
- `ChallengeSessionState`: 最小会话状态
- `ChallengeProgressStatus`: 状态枚举
- `UserResponseSlot`: 用户输入槽位
- Session 管理函数: createSession, appendRound, shouldContinue, updateStatus

**最小可用边界：**
- ✅ 支持多轮追加
- ✅ 跟踪当前轮次和状态
- ✅ 判断是否继续
- ❌ 不实现完整历史管理
- ❌ 不实现持久化产品壳
- ❌ 不实现 CLI 交互循环

### ISSUE 3: Convergence and Stop Conditions

**实现内容：**
- `evaluateConvergence()`: 收敛评估函数
- 3 种停止条件：
  1. Max round limit (硬限制)
  2. Explicit convergence (无冲突 + 有证伪检查)
  3. Unresolved conflicts continue (有冲突则继续)

**最小策略说明：**
- 当前版本使用简单规则
- 未来可扩展：
  - 基于 LLM 的收敛判断
  - 用户显式停止
  - 质量阈值检查
  - 时间/成本限制

### ISSUE 4: Challenge-Asset Connection

**实现内容：**
- `writeChallengeArtifact()`: asset-engine 接收 challenge 输出
- 生成 `challenge.md` 资产文档
- 保持 package boundary：challenge-engine 不直接操作 asset 存储

**集成链路：**
```
idea input
  → multi-round challenge (challenge-engine)
  → ChallengeToAssetHandoff (contract)
  → writeChallengeArtifact (asset-engine)
  → challenge.md (persistence)
```

### ISSUE 5: Golden Path Test

**实现内容：**
- `tests/golden/multi-round-challenge.test.ts`
- 覆盖完整链路：创建会话 → 多轮执行 → 收敛评估 → handoff → 持久化
- 使用 deterministic fake provider
- 验证结构化输出

## 架构决策

### 1. Handoff Contract 优先
在实现集成前先定义 contract，避免临时拼接。

### 2. 最小会话管理
只做状态演进，不做产品化历史管理，保持内核纯净。

### 3. 规则结构化
收敛逻辑是可测试的纯函数，不依赖 prompt。

### 4. 单向依赖
challenge-engine 不依赖 asset-engine，通过 contract 解耦。

### 5. Golden Path 优先
用 golden test 锁定核心链路，防止回归。

## 刻意未做（Deferred Items）

### 延后到 Phase 3：
- decision-engine 业务实现
- challenge 与 decision 的协同
- 多引擎编排

### 延后到 Phase 4：
- CLI 交互循环
- Web UI 实现
- 用户输入验证
- 会话持久化产品壳
- Markdown 导出完整版

### 延后到未来：
- 基于 LLM 的收敛判断
- 高级停止策略
- 会话恢复和回放
- 多用户协作

## 为什么现在还不能开始 Phase 3

**原因：**
1. ✅ challenge-asset 链路已打通，contract 稳定
2. ✅ 多轮会话管理已最小化实现
3. ✅ 收敛逻辑已结构化
4. ⚠️ decision-engine 需要更复杂的状态树
5. ⚠️ decision-engine 需要调度策略
6. ⚠️ challenge 和 decision 的协同需要更高层编排

**Phase 3 前置条件：**
- Phase 2.5 的 contract 和测试必须稳定
- 需要明确 decision-engine 的输入输出 contract
- 需要设计 challenge → decision 的数据流

## 依赖关系

```
challenge-engine
  └─ shared-types (types + contracts)
  └─ llm-adapter (LLM calls)

asset-engine
  └─ shared-types (types + contracts)

shared-types
  └─ zod
```

## 验证清单

- [ ] check:all 通过
- [ ] 所有 golden tests 通过
- [ ] 不引入 decision-engine 业务代码
- [ ] 不引入 CLI/Web 壳
- [ ] Package boundaries 保持清晰

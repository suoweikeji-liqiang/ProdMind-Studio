# Phase 2: Challenge Engine Migration

## 目标

从 prodmind-v1 提炼 challenge-engine 的最小可用内核，实现认知对抗辩论的核心能力。

## 完成内容

### 1. shared-types

实现了 challenge 核心类型定义：

**domain/challenge.ts**
- `ChallengeRole`: 角色类型（architect, assassin, userGhost, grounder）
- `RoleTurn`: 角色回合输出
- `AlternativeHypothesis`: 替代假设
- `ChallengeConflict`: 冲突检测结果
- `ChallengeRound`: 单轮辩论记录
- `ChallengeSession`: 完整辩论会话
- `ChallengeSummary`: 辩论总结

### 2. challenge-engine

实现了最小 challenge 内核：

**roles.ts**
- `getRoleConfig()`: 获取角色配置（prompt + temperature）
- `callRole()`: 调用角色生成输出
- 4 个角色的系统 prompt（内联，最小化）

**rules.ts**
- `detectAlternativeHypothesis()`: 检测替代假设
- `detectConsensusAlert()`: 检测共识警报
- `detectTechEscape()`: 检测技术逃逸
- `validateFalsificationBlock()`: 验证证伪语句
- `detectConflicts()`: 综合冲突检测

**runner.ts**
- `runChallengeRound()`: 执行单轮辩论
- `buildChallengeSummary()`: 生成辩论总结

### 3. 测试

**challenge-engine/src/rules.test.ts**
- 替代假设检测测试（中英文）
- 共识警报检测测试
- 技术逃逸检测测试
- 证伪语句验证测试

**tests/golden/challenge-flow.test.ts**
- 完整 challenge 回合测试
- Summary 生成测试

## 架构决策

### 1. 角色 Prompt 内联
Prompt 直接写在代码中，不使用外部文件。简化部署，保持最小化。

### 2. 规则检测纯函数
所有规则检测都是纯函数，输入输出明确，易于测试。

### 3. 不依赖 CLI 壳
完全移除 inquirer/chalk/ora 等终端交互库，只保留核心逻辑。

### 4. LLM 适配器隔离
通过 llm-adapter 调用 LLM，challenge-engine 不直接依赖 provider SDK。

### 5. 结构化输出
所有输出都是结构化的 TypeScript 类型，不是自由文本。

## 从 prodmind-v1 提炼的模块

✅ 已迁移：
- `roles/index.ts` → `challenge-engine/roles.ts`（简化）
- `consensus-check.ts` → `challenge-engine/rules.ts`
- `debate.ts` → `challenge-engine/runner.ts`（核心逻辑）
- `storage.ts` 的类型定义 → `shared-types/domain/challenge.ts`

❌ 刻意未迁移：
- CLI 交互循环（debate.ts 的 inquirer 部分）
- 终端显示（chalk, divider, printRole）
- 用户输入验证（getUserInput）
- 会话存储（saveSession, listSessions）
- Markdown 导出（export.ts）
- 配置管理（storage.ts 的 config 部分）
- Prompt 文件加载（loadPrompt）
- 降级兜底生成（generateFallbackGrounder）
- 多轮历史拼接（buildRoundHistory）

## 当前 challenge-engine 的最小能力边界

✅ 具备能力：
- 4 个角色的 LLM 调用（architect, assassin, userGhost, grounder）
- 5 种冲突规则检测（替代假设、共识警报、技术逃逸、证伪缺失）
- 单轮辩论执行
- 辩论总结生成
- 结构化输出

❌ 不具备能力：
- 多轮辩论管理
- 用户交互（输入/确认）
- 会话持久化
- 历史记录管理
- Markdown 导出
- 降级兜底
- 强制重试（如 assassin 同意时强制反对）

## 与 asset-engine 的连接点

当前 challenge-engine 和 asset-engine 是独立的：
- challenge-engine 生成 `ChallengeSummary`
- asset-engine 可以接收 challenge 输出并写入资产文档
- 连接点在应用层（CLI/Web），不在引擎层

未来可以：
1. 在 asset-engine 中添加 `writeChallengeArtifact()` 方法
2. 将 `ChallengeSummary` 转换为 markdown 文档
3. 与 ProjectState 关联

## 下一步（Phase 3 前）

当前状态：
- ⏳ 需要验证 check:all 通过
- ⏳ 需要构建和测试
- ✅ 核心逻辑已实现
- ✅ 类型定义完整
- ✅ 基础测试覆盖

建议补充（可选）：
1. 添加多轮辩论管理
2. 添加会话持久化接口
3. 完善错误处理
4. 添加更多测试用例
5. 与 asset-engine 建立正式连接

## 依赖关系

```
challenge-engine
  └─ shared-types (types only)
  └─ llm-adapter (LLM calls)

shared-types
  └─ zod
```

## 验证清单

- [ ] check:docs 通过
- [ ] check:boundaries 通过
- [ ] check:forbidden-deps 通过
- [ ] lint 通过
- [ ] typecheck 通过
- [ ] test 通过
- [ ] build 通过

# Quality Gates for ProdMind-Studio

## 0. 文档目标
作为 CI、PR 审查、分支保护与合并决策的统一依据，约束迁移期与长期迭代期质量底线。

## 1. 门禁目标

## 1.1 为什么必须有门禁
- 本产品是“多引擎 + 双界面 + AI 不稳定输入 + 资产沉淀输出”的复合系统。
- 没有统一门禁会出现：
  - 引擎边界污染
  - 类型契约漂移
  - 产物格式回归
  - 测试形同虚设

## 1.2 对本产品最重要的价值排序
- 第一优先：状态与资产正确性。
- 第二优先：引擎边界与契约稳定性。
- 第三优先：可追溯与可回归。
- 快速堆功能不是优先级，除非不破坏上述三项。

## 2. 基础门禁（全仓）

## 2.1 必须通过的自动门禁
- `lint`
- `typecheck`
- `test`
- `build`
- package boundary check
- forbidden dependency check
- docs update check

## 2.2 建议门禁命令（示例）
```bash
pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
pnpm -r --if-present build
```

## 2.3 package boundary check
- `MUST`：
  - 禁止 `packages/*` 反向依赖 `apps/*`。
  - 禁止 engine 直接依赖 UI 框架与页面层。
- `MUST`：在 CI 中执行 import 边界校验（脚本或规则工具）。

## 2.4 forbidden dependency check
- `MUST`：对 engine 包执行禁用依赖扫描，至少包括：
  - `next`
  - `react`
  - `@supabase/supabase-js`
  - `commander`
  - `inquirer`
  - `chalk`
  - `ora`

## 2.5 docs update check
- `MUST`：核心架构/契约变更必须同步更新相关文档：
  - `module-boundary.md`
  - `shared-types-plan.md`
  - `llm-adapter-contract.md`
  - `migration-plan.md`
  - 对应标准文档（UI/Testing/Quality）

## 3. 分层门禁

## 3.1 `shared-types`
- 必须门禁：
  - 向后兼容检查
  - 合约测试
  - 变更影响说明（PR 描述）
- 额外要求：
  - 高风险变更需双人审查（至少一位引擎负责人）。

## 3.2 `llm-adapter`
- 必须门禁：
  - 错误归一化测试
  - 重试逻辑测试
  - 结构化 fallback 测试
- 额外要求：
  - provider 细节不可泄漏到 engine 的静态检查通过。

## 3.3 `asset-engine`
- 必须门禁：
  - 状态一致性测试
  - 资产生成 golden 测试
  - 原子写恢复测试
- 额外要求：
  - 输出格式变更必须附升级说明与回归用例。

## 3.4 `challenge-engine`
- 必须门禁：
  - 冲突规则回归测试
  - 状态流测试
  - 导出结构合约测试
- 额外要求：
  - 规则阈值/正则变化必须附行为对比说明。

## 3.5 `decision-engine`
- 必须门禁：
  - 调度器测试
  - parser 健壮性测试
  - 状态树与快照一致性测试
- 额外要求：
  - 置信度计算逻辑变更需附前后对比样例。

## 3.6 `apps/cli`
- 必须门禁：
  - 命令语义测试
  - 关键交互路径测试
  - 非交互模式输出测试

## 3.7 `apps/web`
- 必须门禁：
  - API route 集成测试
  - 关键流程 E2E
  - 异步状态展示测试（至少 smoke 级）

## 4. PR 审查原则

## 4.1 哪类 PR 必须带测试
- `MUST`：
  - 所有业务逻辑变更 PR。
  - 所有状态模型、解析器、导出格式变更 PR。

## 4.2 哪类 PR 必须带文档更新
- `MUST`：
  - 契约变更（shared types / llm adapter）。
  - 架构边界变更（engine 与 app 责任调整）。
  - 门禁策略或测试策略调整。

## 4.3 哪类 PR 必须补 migration plan
- `MUST`：
  - 涉及 Phase 范围变更或优先级调整。
  - 涉及跨仓迁移策略调整（Phase 1/2/3 输入源变化）。

## 4.4 哪类 PR 不允许“顺手大改”
- 禁止：
  - 在同一 PR 同时做“契约重构 + UI 重做 + 测试框架改造”。
  - 无明确主题的大规模重命名与逻辑变更混杂。

## 4.5 哪类 PR 需要人工重点审查
- 高风险改动（见第 5 节）。
- 跨包接口变化。
- 删除测试或降低覆盖率门槛。

## 5. 高风险改动门禁

## 5.1 共享类型变更
- `MUST`：
  - 提供兼容性说明。
  - 附合约测试更新。
  - 需至少 2 位 reviewer（含 1 位引擎负责人）。

## 5.2 状态模型变更
- `MUST`：
  - 提供迁移策略或兼容策略。
  - 提供状态流回归测试。

## 5.3 文档输出格式变更
- `MUST`：
  - 更新 golden files。
  - 给出破坏性影响评估（下游依赖是否受影响）。

## 5.4 LLM adapter 合约变更
- `MUST`：
  - 更新 `llm-adapter-contract.md`。
  - 更新 adapter contract tests。
  - 验证 engine 无 provider 泄漏。

## 5.5 challenge / decision 核心规则变更
- `MUST`：
  - 增加规则行为回归用例（至少 1 正常 + 1 边界 + 1 异常）。

## 5.6 CLI 命令语义变更
- `MUST`：
  - 更新 CLI 用法文档与示例。
  - 保证旧命令兼容或明确 breaking change 策略。

## 5.7 Web 信息架构变更
- `MUST`：
  - 更新 `ui-standards.md` 对应规则条目。
  - 附 IA 变更图或文本说明（页面层级、导航路径、入口出口）。

## 6. 质量红线（违反即拒绝合并）
- 不允许跳过测试直接合并。
- 不允许核心架构变更不更新文档。
- 不允许 engine 直接依赖 UI 壳。
- 不允许 provider 细节泄漏到 engine。
- 不允许未评估的数据结构破坏性变更。
- 不允许大而杂、不可审查的 PR。

## 7. PR Gate Checklist

## 7.1 基础检查
- [ ] lint / typecheck / test / build 全通过。
- [ ] 边界检查与禁用依赖检查通过。
- [ ] 改动范围与 PR 标题一致。

## 7.2 测试与回归
- [ ] 本次逻辑变更已补充对应层级测试。
- [ ] 高风险逻辑已附回归测试。
- [ ] 无随机性污染的 flaky 测试。

## 7.3 文档与契约
- [ ] 契约变更已同步更新文档。
- [ ] 输出格式变更已更新 golden 与说明。
- [ ] 迁移相关改动已更新 migration 文档。

## 7.4 审查与合并
- [ ] 高风险改动已完成双人审查。
- [ ] PR 大小可审查（单主题、可回滚）。
- [ ] 不存在“顺手大改”混入。


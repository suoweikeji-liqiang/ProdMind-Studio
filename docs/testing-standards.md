# Testing Standards for ProdMind-Studio

## 0. 目标与适用范围
- 目标：
  - 保证系统不仅“能跑”，而且“状态正确、资产可靠、规则稳定、可回归”。
- 适用范围：
  - `packages/shared-types`
  - `packages/llm-adapter`
  - `packages/asset-engine`
  - `packages/challenge-engine`
  - `packages/decision-engine`
  - `apps/cli`
  - `apps/web`

## 1. 测试分层（按模块）

## 1.1 `shared-types`
- `MUST`：
  - 类型定义与 schema（如有）一致性测试。
  - 序列化/反序列化兼容性测试。
  - 向后兼容测试（新增字段不可破坏旧 payload）。
- `SHOULD`：
  - 类型版本迁移样例（旧版 payload -> 新版解析）。

## 1.2 `llm-adapter`
- `MUST`：
  - `generateText` / `generateStructured` / `streamText` 合约测试。
  - 错误归一化测试（AUTH/RATE_LIMIT/TIMEOUT/NETWORK/INVALID_RESPONSE/UNKNOWN）。
  - 结构化解析失败 fallback 测试。
  - 重试策略测试（可重试错误重试，不可重试错误立即失败）。
- `MUST NOT`：
  - 用真实模型作为主 CI 门禁测试依赖。

## 1.3 `asset-engine`
- `MUST`：
  - 状态推进测试（阶段迁移、更新时间、写入幂等）。
  - 项目生命周期测试（create/open/list/delete）。
  - 快照测试（tag 冲突、恢复与读取）。
  - 资产输出测试：
    - `idea`
    - `decisions`
    - `research`
    - `spec`
    - `acceptance`
    - `tasks`
  - 原子写入与恢复测试（`.tmp` 恢复路径）。

## 1.4 `challenge-engine`
- `MUST`：
  - 冲突规则测试（替代假设、反共识、技术逃逸、证伪块）。
  - 回合状态流测试（start -> attack -> conflict -> user_response -> grounding）。
  - 结论导出结构测试（可供资产引擎 ingest）。
- `SHOULD`：
  - 多语言关键词/正则鲁棒性测试（至少中文+英文样本）。

## 1.5 `decision-engine`
- `MUST`：
  - 调度器测试（不同 round + state 下 agent 激活集合）。
  - parser 测试（假设/风险/问题定义提取）。
  - 置信度计算测试。
  - 快照一致性测试（state tree 与 snapshot 对齐）。
  - 假设/风险/决策状态一致性测试。
- `SHOULD`：
  - 复杂路径状态流测试（修改目标、驳回、强制推进）。

## 1.6 `apps/cli`
- `MUST`：
  - 非交互模式测试（参数、输出、退出码）。
  - 交互模式测试（最小 happy path + 错误路径，使用输入脚本模拟）。
  - 命令语义回归测试（命令名、参数、默认行为）。
- `MUST NOT`：
  - 仅做 snapshot 文本比对而无语义断言。

## 1.7 `apps/web`
- `MUST`：
  - API route 集成测试（输入验证、状态码、错误语义）。
  - 长任务与异步状态显示测试（running/waiting/partial_failed/failed）。
  - 关键流程 E2E（创建项目 -> 会话推进 -> 资产查看/导出）。
- `SHOULD`：
  - 信息架构 smoke tests（核心页面可访问、关键导航不断链）。

## 2. 测试类型与落地方式

## 2.1 单元测试（Unit）
- 场景：
  - 纯函数、规则判定、parser、状态计算、格式转换。
- 要求：
  - `MUST` 快速、可并行、无外部依赖。

## 2.2 集成测试（Integration）
- 场景：
  - engine 内模块协同（状态 + 输出 + 事件）。
  - app 与 engine 接口联动。
- 要求：
  - `MUST` 使用可控假数据与 fake provider。

## 2.3 合约测试（Contract）
- 场景：
  - `shared-types` payload 合法性。
  - `llm-adapter` 对 engine 的稳定接口。
- 要求：
  - `MUST` 在跨包改动时强制执行。

## 2.4 快照测试（Snapshot Test）
- 场景：
  - 稳定结构文本（短结构块、状态对象）。
- 要求：
  - `SHOULD` 配合语义断言，避免纯文本脆弱快照。

## 2.5 Golden File 测试
- 场景：
  - `spec/acceptance/tasks` 产物。
  - challenge/decision 导出结果格式。
- 要求：
  - `MUST` 固定输入 -> 固定输出。
  - `MUST` 评审 golden 变更，不允许自动覆盖后直接通过。

## 2.6 状态流测试（State Flow）
- 场景：
  - 会话推进、快照生成、冲突处理、回退与恢复。
- 要求：
  - `MUST` 覆盖正常流、异常流、部分失败流。

## 2.7 回归测试（Regression）
- 规则：
  - `MUST`：修复过的生产级 bug 必须新增回归测试。
  - `MUST`：回归测试命名应包含 bug 语义与预期行为。

## 2.8 E2E 测试
- 场景：
  - CLI 关键命令链路。
  - Web 关键业务链路（不是像素级测试）。
- 要求：
  - `SHOULD` 覆盖高价值路径，不追求 UI 全覆盖。

## 2.9 AI 输出结构测试
- 场景：
  - 结构化输出解析、fallback、schema 校验。
- 要求：
  - `MUST` 模拟 malformed JSON、缺字段、超字段、混杂文本。

## 2.10 prompt / parser / schema 健壮性测试
- 场景：
  - prompt 演化后 parser 不崩。
  - schema 升级后旧数据仍可解析或有明确迁移失败提示。

## 3. 本产品重点测试对象（必须覆盖）
- 项目状态推进（clarity stage / round stage / snapshot version）。
- 文档输出完整性与稳定性（idea / decisions / research / spec / acceptance / tasks）。
- 角色冲突规则准确性（包含反共识、证伪逻辑）。
- 假设 / 风险 / 决策 / 快照 的一致性。
- `llm-adapter` 结构化解析失败 fallback 行为。
- 重试机制正确性（可重试 vs 不可重试）。
- 部分失败恢复行为（保留已成功结果，允许局部重试）。
- CLI 交互与非交互两种模式。
- Web 长任务与异步状态反馈。

## 4. 测试数据与策略

## 4.1 Mock LLM 原则
- `MUST`：默认使用 deterministic fake provider。
- `MUST`：输入相同输出相同，保证测试可重复。
- `MUST`：覆盖成功、格式异常、超时、速率限制四类响应。

## 4.2 Fixture 使用规则
- 用 fixture 的场景：
  - 复杂状态树、历史会话、导出样例。
- `MUST`：fixture 命名包含业务语义，不使用 `data1.json` 这类命名。

## 4.3 Golden File 使用规则
- 用 golden 的场景：
  - 文档资产输出、关键导出结构。
- `MUST`：golden 文件放在版本控制中并走 code review。

## 4.4 Deterministic Fake Provider
- `MUST`：
  - 支持按测试用例注入固定响应序列。
  - 支持模拟 streaming token 序列。
  - 支持注入标准化错误。

## 4.5 真实模型冒烟测试
- 允许条件：
  - 手动触发或 nightly 非阻塞流水线。
- `MUST NOT`：
  - 将真实模型测试作为主分支合并前置硬门禁。

## 4.6 避免模型随机性污染
- `MUST`：CI 主流程不依赖真实模型输出文本一致性。
- `MUST`：行为断言优先于文本全量断言。
- `SHOULD`：对文本断言使用结构/关键字段断言而非逐字断言。

## 5. 覆盖率与质量要求

## 5.1 覆盖率建议门槛
- `shared-types`：语句覆盖率 >= 90%，分支覆盖率 >= 85%。
- `llm-adapter`：语句覆盖率 >= 90%，分支覆盖率 >= 85%。
- `asset-engine`：语句覆盖率 >= 85%，关键模块（state/output）>= 90%。
- `challenge-engine` / `decision-engine`：
  - 关键规则与状态机分支覆盖率 >= 85%。
- `apps/*`：
  - 不以高覆盖率为目标，重点保证关键流程行为测试。

## 5.2 行为测试优先层
- `apps/web`、`apps/cli`：
  - 优先 E2E 与集成行为，不追逐纯覆盖率数字。

## 5.3 必补回归测试的 bug 类型
- 状态破坏、资产格式破坏、冲突规则误判、解析回退失效、重试错误。

## 5.4 命名、目录、断言风格
- 目录建议：
  - `tests/unit`
  - `tests/integration`
  - `tests/contract`
  - `tests/e2e`
  - `tests/golden`
- 命名建议：
  - `should_<behavior>_when_<condition>`
- 断言风格：
  - `MUST` 断言“业务语义结果”，不只断言“函数被调用”。

## 6. Testing Review Checklist

## 6.1 分层覆盖
- [ ] 本次改动涉及的包层是否有对应测试更新。
- [ ] 是否同时覆盖正常、异常、部分失败路径。

## 6.2 AI 与解析
- [ ] 是否验证了结构化输出失败回退。
- [ ] 是否验证了错误归一化与重试逻辑。

## 6.3 资产与状态
- [ ] 是否验证了状态推进与快照一致性。
- [ ] 是否验证了资产输出格式与内容关键字段。

## 6.4 工程质量
- [ ] 测试是否 deterministic。
- [ ] 是否新增了必要回归测试。
- [ ] 是否避免把真实模型输出稳定性当成主门禁依赖。


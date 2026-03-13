# CLI+ Challenge Handoff Design

## Goal

把网页端 `challenge` 从“多角色聊天 + 事件流”升级成严格的前置工序：

- 保留命令行版的强约束语义和推进纪律
- 每轮结束生成结构化 `handoff` 包
- `decision` 和 `requirement-build` 直接消费 `handoff`，不再像新开会话

本轮只收主链，不重做另外两个模式的完整页面壳。

## Why

当前网页版相对命令行的核心问题不是样式，而是工作流语义偏松：

1. `challenge` 缺少显式 `用户确认` 检查点
2. 中断分支没有被真正变成必须跨过的门槛
3. `用户幽灵` 还偏通用问题清单，不够 persona 化
4. 落地收束还不够硬，导致切模时像重开一场

命令行版的精华在于：它把模糊议题压成可裁决、可交接、可起草的上游结果。网页版应保留这一点，并额外利用结构化数据和多栏布局优势。

## Scope

### In Scope

- 强化 `challenge` 主链语义
- 为每轮 `challenge` 生成结构化 `handoff`
- 用 `handoff` 驱动切到 `decision` / `requirement-build` 的首屏承接
- 为网页前后端增加显式门禁和成熟度阻断
- 调整 `challenge` 页面行为，使其围绕“当前步骤 + 必答项 + handoff 完整度”工作

### Out of Scope

- `decision` / `requirement-build` 的完整三栏重构
- 其它历史页、回放页、导出格式的大改
- 新的 provider 策略或异步后台任务系统
- 新的工作流模式

## Target Flow

网页版 `challenge` 固定成以下 6 步，禁止跳步：

1. `架构师 framing`
2. `用户确认`
3. `刺客`
4. `用户鬼`
5. `用户回应`
6. `落地者收束`

### Step 1: 架构师 framing

本步产出必须包含：

- 一句话核心问题
- 问题边界
- 关键变量
- 最多 3 个澄清问题

### Step 2: 用户确认

本步不再接受“泛泛回复”，而是收成 3 个明确槽位：

- 场景/行业
- 3 个核心痛点
- 资源约束

这一步的网页输入仍然可以是自由文本，但前后端都要校验上述 3 个槽位是否被有效回答。

### Step 3: 刺客

本步产出必须包含：

- 隐含假设
- 替代解释
- 结构漏洞
- 最小证伪动作
- 替代假设标签

### Step 4: 用户鬼

本步产出必须包含：

- 我是谁
- 我为什么不会用
- 我现在的替代方案
- 如果这是错的
- 用户回应位置留空

这里要把“用户鬼”从通用质疑清单升级成 adoption/persona 风险输出。

### Step 5: 用户回应

用户不能只“继续说两句”，必须明确选择一种回应路径：

- 接受部分质疑
- 反驳替代假设
- 补充缺失上下文
- 收窄目标

网页上用按钮帮助用户进入路径，但点击按钮只填模板，不自动提交。

### Step 6: 落地者收束

本步产出必须包含：

- 当前最强假设
- MVP 边界
- 未决冲突
- 下一步行动
- 本轮证伪检查

没有 `未决冲突` 和 `下一步行动`，本轮不能结束，也不能切下游模式。

## Handoff Model

每轮 `challenge` 结束后，除保留原始角色消息外，还要生成结构化 `challenge_handoff`：

```ts
challenge_handoff = {
  topic: string,
  problem_frame: {
    one_sentence_problem: string,
    boundaries: string[],
    key_variables: string[],
  },
  user_confirmed_context: {
    scenario: string,
    top_pains: string[],
    constraints: string[],
  },
  strongest_counter_hypothesis: string,
  adoption_risks: string[],
  mvp_scope: {
    include: string[],
    exclude: string[],
    one_week_scope: string[],
  },
  open_conflicts: string[],
  next_validation_actions: string[],
  evidence_trace: {
    architect_message_id?: string,
    assassin_message_id?: string,
    userGhost_message_id?: string,
    user_response_message_id?: string,
    grounder_message_id?: string,
  },
  round_status: {
    mature_enough_for_decision: boolean,
    mature_enough_for_requirement_build: boolean,
  },
};
```

### Design Notes

- `handoff` 是轮次产物，不替代原始消息
- `evidence_trace` 用于回放、审计和后续调试
- `round_status` 不是简单布尔开关，而是门禁结果的缓存表达

## Gating Rules

### Step Gates

- `用户确认` 缺任一槽位：不能进入 `刺客`
- `用户回应` 未选择回应路径：不能进入 `落地者`
- `落地者` 未生成 `未决冲突 + 下一步行动`：不能完成本轮

### Handoff Gates

- 缺完整 `handoff`：不能切 `decision`
- 缺 `mvp_scope + user_confirmed_context`：不能切 `requirement-build`

### Maturity Gates

- 即使有 `handoff`，只要 `open_conflicts` 仍明显未收束，就禁止直接切 `requirement-build`
- 这类情况允许切 `decision`，不允许切 `requirement-build`

## Failure Strategy

### User Input Structurally Invalid

前端直接拦截，并提示缺少的必答项；后端重复校验，防止绕过。

### Model Output Structurally Invalid

当前 phase 不推进，保留在原步骤，提示“本步产出不完整，请重试”。

### Provider Timeout / Fallback

允许降级，但 fallback 也必须满足当前步骤的最小结构。不能产出“空收束”。

### Downstream Mode Context Missing

直接阻止切模，并告诉用户：

- 缺哪一块 handoff
- 为什么现在不该切
- 下一步该补什么

## UI Behavior

本轮不重做整体壳，但要把当前 `challenge` 工作台行为升级为门禁式工作台：

### Current Step Focus Card

焦点卡必须显示：

- 当前是第几步
- 当前步的目标
- 还缺哪些必答项
- 满足什么条件才能进入下一步

### Checklist Above Input

输入区上方显示当前步骤的 checklist；未完成项高亮。

### Explicit Response Path

在 `用户回应` 步提供路径按钮：

- 接受部分质疑
- 反驳替代假设
- 补充缺失上下文
- 收窄目标

点击只改写模板，不直接提交。

### Mode Switching

切模按钮默认受 `handoff` 成熟度控制。未满足时，不是隐藏，而是禁用并给出阻止理由。

## Downstream Consumption

### Decision

`decision` 首屏不再从空白问题开始，而是消费：

- `当前最强假设`
- `未决冲突`
- `下一步行动`

它的职责是对冲突做取舍，而不是重新理解背景。

### Requirement-Build

`requirement-build` 首屏直接消费：

- `problem_frame`
- `user_confirmed_context`
- `mvp_scope.include/exclude`
- `constraints`

并明确标识：

- 哪些是已确认事实
- 哪些仍是未决冲突，不得伪装成既定规格

## Code Areas

预计主要触达：

- `packages/shared-types/src/session/conversation.ts`
- `apps/web/src/state/session-store.ts`
- `apps/web/src/routes/sessions.ts`
- `packages/challenge-engine/src/runner.ts`
- `apps/web/src/views/challenge-workbench-model.ts`
- `apps/web/src/views/index.ts`
- `apps/web/src/web.test.ts`

## Test Criteria

验收标准以行为为准：

1. `challenge` 固定按 6 步推进，不能跳步
2. 每一步缺关键字段时，前后端都能拦截
3. 每轮结束生成完整 `handoff`
4. `decision` 打开时直接看到 `handoff` 核心信息
5. `requirement-build` 打开时直接带入 `mvp_scope + constraints`
6. 不满足成熟度时，模式切换被阻止且原因明确
7. provider 降级时，仍满足最小结构，不产生空结果

## Recommendation

这轮实现策略应以“语义先于布局”为原则：

1. 先做严格主链和 `handoff`
2. 再把网页工作台绑定到这些语义
3. 最后让 `decision` / `requirement-build` 消费 `handoff`

不要先做更大的页面重构。

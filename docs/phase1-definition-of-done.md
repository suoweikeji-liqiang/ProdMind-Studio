# Phase 1 Definition of Done

## 范围定义
Phase 1 = “基础契约 + asset-engine 内核落地 + llm-adapter 最小契约”，不含 UI/CLI 壳整合。

## DoD Checklist

## 1. 结构与边界完成
- [ ] `packages/shared-types` 已包含 Phase 1 约定的 `asset` + `cross-engine` P0 类型。
- [ ] `packages/asset-engine` 具备可调用的核心模块（状态、项目、快照、研究、资产编译）。
- [ ] `packages/llm-adapter` 提供最小统一接口（见 `llm-adapter-contract.md`）。
- [ ] `packages/*` 不依赖 CLI/Web 壳库（见 `phase1-exclusion-list.md`）。

## 2. 可编译
- [ ] workspace 级 TypeScript 可通过（无类型错误）。
- [ ] `shared-types`、`asset-engine`、`llm-adapter` 均可单包通过 typecheck/build。

建议验收命令（Phase 1 完成时执行）：
```bash
pnpm -r --if-present typecheck
pnpm -r --if-present build
```

## 3. 最小测试通过
- [ ] `asset-engine` 至少覆盖以下最小测试：
  - 状态读写与 schema 校验
  - `atomic` 写入与恢复行为
  - 项目 create/open/list/delete
  - snapshot tag 冲突校验
  - `compile` 生成 `spec/acceptance/tasks`
- [ ] `llm-adapter` 至少覆盖：
  - `generateText` 正常返回
  - `generateStructured` parse/fallback
  - `normalizeError` 分类稳定

建议验收命令：
```bash
pnpm -r --if-present test
```

## 4. 基础文档资产可生成
- [ ] 对一个最小 project state，能生成：
  - `spec.md`
  - `acceptance.md`
  - `tasks.md`
- [ ] 生成输出不依赖 commander/inquirer/chalk/Next.js/Supabase。

## 5. 无 Shell 依赖泄漏
- [ ] `packages/asset-engine`、`packages/shared-types`、`packages/llm-adapter` 中不存在以下依赖导入：
  - `commander`
  - `inquirer`
  - `chalk`
  - `ora`
  - `next`
  - `react`
  - `@supabase/supabase-js`
- [ ] 引擎代码中不存在 `app/page`、`components`、CLI 交互循环等壳层路径引用。

## 6. 文档与可执行性
- [ ] Phase 1 契约文档齐备并可供自动执行：
  - `shared-types-plan.md`
  - `llm-adapter-contract.md`
  - `phase1-exclusion-list.md`
  - `phase1-definition-of-done.md`
- [ ] 迁移输入文件清单与边界策略可直接驱动下一步实施。

## 完成判定
当以上 6 组检查全部满足，且未引入壳层依赖，即判定 Phase 1 完成。


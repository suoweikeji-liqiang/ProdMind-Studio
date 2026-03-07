# Phase 1 Exclusion List

## 目标
明确 Phase 1 不迁移范围，防止“壳层先行”导致分层重构失焦。

## 总规则
- Phase 1 只做内核能力与契约层。
- CLI/Web 框架壳、页面壳、终端样式壳全部排除。

## 1. CLI 壳依赖（排除）

### 依赖库排除
- `commander`
- `inquirer`
- `chalk`
- `ora`
- `readline/promises` 的交互循环壳

### 代表路径（来源仓）
- `requirement-co-builder/src/bin/req.ts`
- `requirement-co-builder/src/dialogue/session.ts`（交互 loop）
- `prodmind-v1/prodmind-cli/src/index.ts`
- `prodmind-v2/prodmind2-cli/src/index.ts`
- `prodmind-v2/prodmind2-cli/src/session.ts`（CLI 人机菜单流程）

## 2. Web UI 壳（排除）

### Next.js 页面与组件排除
- `src/app/**`（页面、layout、route 壳中的框架绑定逻辑）
- `src/components/**`
- `src/hooks/**`（UI 驱动 hooks）
- `src/stores/**`（UI 状态 store）
- `src/i18n/**`
- CSS 与样式相关文件

### 代表路径（来源仓）
- `prodmind-v1/prodmind-web/src/app/**`
- `prodmind-v1/prodmind-web/src/components/**`
- `prodmind-v2/prodmind2-web/src/app/**`
- `prodmind-v2/prodmind2-web/src/components/**`
- `prodmind-v2/prodmind2-web/src/stores/session-store.ts`

## 3. Auth 与平台集成壳（排除）

### Supabase Auth / Middleware 排除
- 登录、回调、middleware、会话页面框架壳。

### 代表路径（来源仓）
- `prodmind-v2/prodmind2-web/src/lib/supabase/{client.ts,server.ts,middleware.ts}`
- `prodmind-v2/prodmind2-web/src/middleware.ts`
- `prodmind-v2/prodmind2-web/src/app/login/page.tsx`
- `prodmind-v2/prodmind2-web/src/app/auth/callback/route.ts`

## 4. 数据库/部署平台壳（Phase 1 排除）
- 具体 Supabase RLS/Auth 绑定实现不迁移到 engine。
- Next.js route handler 内框架生命周期控制不迁移为 engine 逻辑。
- 部署文档与平台脚本（如 `DEPLOY.md`）不作为内核迁移对象。

## 5. 仅保留“可抽纯逻辑”例外
- 若某文件在壳层目录中但存在可独立的纯函数逻辑，可“摘取函数”迁入 engine，原文件不整体迁移。

## 6. Phase 1 禁止引入依赖清单（对 engine/package 生效）
- `commander`
- `inquirer`
- `chalk`
- `ora`
- `next`
- `react`
- `react-dom`
- `@supabase/supabase-js`
- `@supabase/ssr`
- `zustand`


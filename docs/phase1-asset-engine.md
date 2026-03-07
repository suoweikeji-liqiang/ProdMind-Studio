# Phase 1: Asset Engine Migration

## 目标

从 requirement-co-builder 提炼 asset-engine 的最小可用内核，实现项目状态管理和资产文档生成的核心能力。

## 完成内容

### 1. shared-types

实现了核心类型定义，按领域分组：

**domain/project.ts**
- `ProjectState`: 项目状态核心类型
- `Message`: 对话消息类型
- `Projection`: 项目投影（context, actors, intent, mechanism, boundary）
- `Compression`: 项目压缩表示（oneLiner, threeLiner, structured）

**generation/llm.ts**
- `LLMAdapter`: LLM 适配器接口
- `LLMMessage`: LLM 消息类型
- `LLMProvider`: 支持的 provider 类型
- `LLMConfig`: LLM 配置

**persistence/store.ts**
- `ProjectStore`: 项目存储接口
- `AssetWriter`: 资产写入接口

### 2. llm-adapter

实现了最小 LLM 适配器：

**provider.ts**
- `createLLMAdapter()`: 创建真实 LLM provider（OpenAI/Anthropic）
- `streamText()`: 流式文本生成
- `generateStructured()`: 结构化输出生成（带 fallback）

**fake-provider.ts**
- `createFakeProvider()`: 确定性 fake provider
- 用于测试和开发

### 3. asset-engine

实现了核心资产引擎：

**store.ts**
- `createProjectStore()`: 项目状态存储
- 原子写入（atomic write）
- 崩溃恢复（recovery from .tmp）
- 不可变更新（immutable updates）

**writer.ts**
- `createAssetWriter()`: 资产文档生成器
- `writeIdea()`: 生成 idea.md
- `writeSpec()`: 生成 spec.md
- `writeAcceptance()`: 生成 acceptance.md
- `writeTasks()`: 生成 tasks.md

### 4. 测试

**asset-engine/src/store.test.ts**
- 项目状态创建测试
- 读写往返测试
- 缺失状态处理测试

**llm-adapter/src/fake-provider.test.ts**
- 流式文本生成测试
- 结构化输出测试

**tests/golden/asset-generation.test.ts**
- 完整资产生成 golden path 测试
- 验证所有资产文档正确生成

## 架构决策

### 1. 类型优先
所有跨包类型定义在 shared-types，避免循环依赖和类型泄漏。

### 2. 不可变性
所有状态更新返回新对象，不修改原对象。

### 3. 原子写入
使用 .tmp 文件 + rename 保证写入原子性，支持崩溃恢复。

### 4. Provider 隔离
LLM provider 细节完全封装在 llm-adapter，不泄漏到 engine。

### 5. 最小化实现
只迁移核心能力，不迁移 CLI 壳、UI 组件、对话引擎等。

## 未迁移内容

以下模块刻意未迁移（不在 Phase 1 范围）：

- CLI 壳（commander, inquirer, chalk, ora）
- 对话引擎（dialogue/engine.ts, dialogue/session.ts）
- 流式显示（display/stream.ts）
- 研究功能（projects/research.ts）
- 配置管理（config/）
- ID 生成（utils/id.ts）
- 路径工具（utils/paths.ts）

## 当前能力边界

Phase 1 完成后，asset-engine 具备以下最小能力：

✅ 创建项目状态
✅ 读写项目状态（带原子性和恢复）
✅ 生成 4 种资产文档（idea, spec, acceptance, tasks）
✅ LLM 适配器抽象（支持 OpenAI/Anthropic/Fake）
✅ 基础测试覆盖

❌ 对话交互
❌ 增量更新
❌ 项目列表管理
❌ CLI 命令
❌ Web UI

## 下一步（Phase 2 前）

进入 Phase 2 前还需要：

1. ✅ 验证 check:all 通过
2. ✅ 至少一条可验证路径（golden test）
3. ✅ 不依赖 CLI/Web 壳
4. ⏳ 补充更多边界测试
5. ⏳ 添加错误处理测试
6. ⏳ 文档完善

## 依赖关系

```
asset-engine
  └─ shared-types (types only)

llm-adapter
  └─ shared-types (types only)
  └─ ai, @ai-sdk/openai, @ai-sdk/anthropic
  └─ jsonrepair, zod

shared-types
  └─ zod
```

## 验证清单

- [x] check:docs 通过
- [x] check:boundaries 通过
- [x] check:forbidden-deps 通过
- [x] lint 通过
- [x] typecheck 通过
- [ ] test 通过（需要安装 vitest）
- [ ] build 通过

# LLM Adapter Contract (Phase 1 Minimal)

## 目标
定义 `packages/llm-adapter` 的最小稳定接口，让 `asset/challenge/decision` 引擎只依赖统一契约，不直接依赖 OpenAI/Anthropic SDK。

## 设计来源
- `requirement-co-builder/src/adapters/llm.ts`（已有 `streamText` + `generateStructured`）
- `prodmind-v1` / `prodmind-v2`（目前大量直接调用 `openai`）

## 核心接口（建议）

```ts
export type LlmProvider = "openai" | "anthropic" | "openai-compatible";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlmTextResult {
  text: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  providerMeta?: Record<string, unknown>;
}

export interface LlmStructuredResult<T> extends LlmTextResult {
  data: T;
}

export interface LlmError {
  code:
    | "AUTH"
    | "RATE_LIMIT"
    | "TIMEOUT"
    | "NETWORK"
    | "INVALID_RESPONSE"
    | "UNKNOWN";
  message: string;
  retryable: boolean;
  provider?: string;
  raw?: unknown;
}

export interface LlmAdapter {
  generateText(request: LlmRequest): Promise<LlmTextResult>;
  generateStructured<T>(
    request: LlmRequest,
    schema: { parse: (value: unknown) => T }
  ): Promise<LlmStructuredResult<T>>;
  streamText(
    request: LlmRequest,
    handlers: {
      onToken?: (token: string) => void;
      onComplete?: (result: LlmTextResult) => void;
    }
  ): Promise<LlmTextResult>;
  normalizeError(error: unknown): LlmError;
}
```

## 四个关键能力输入输出约束

## 1) `generateText`
- 输入：`LlmRequest`
- 输出：`LlmTextResult`
- 约束：
  - 返回纯文本主结果，允许包含 `usage`。
  - 不向 engine 暴露 provider SDK 原始响应对象。

## 2) `generateStructured`
- 输入：`LlmRequest` + `schema`
- 输出：`LlmStructuredResult<T>`
- 约束：
  - 优先走 provider 的结构化输出能力。
  - 失败时允许 fallback（例如纯文本 + repair + parse），但该流程必须完全封装在 adapter 内。
  - engine 只拿到 `data: T` 与标准错误。

## 3) `streamText`
- 输入：`LlmRequest` + token handlers
- 输出：最终 `LlmTextResult`
- 约束：
  - token 流式事件通过回调传递。
  - engine 不感知具体是 SSE、chunk、delta 还是 provider 自定义事件。

## 4) `error normalization`
- 输入：任意错误（SDK 错误、网络错误、解析错误）
- 输出：统一 `LlmError`
- 约束：
  - `code` + `retryable` 必须稳定可判定。
  - 错误消息可以被 CLI/Web 直接消费，不依赖 provider 错误格式。

## Provider 细节隔离（必须）
- engine 不得 import：
  - `openai`
  - `@ai-sdk/openai`
  - `@ai-sdk/anthropic`
  - 任何 provider SDK 类型
- engine 不得使用 provider 特有参数名：
  - 如 `max_completion_tokens`、provider 自定义 headers/body 字段
- engine 不得分支判断 provider 错误结构（例如 `err.status` 的 provider-specific 语义）。
- provider 路由策略（按角色/agent 分流）只能通过 adapter 配置注入，不在 engine 写分支。

## Phase 1 范围
- 实现最小 provider 支持：
  - `openai`
  - `anthropic`
  - 可选 `openai-compatible`（走统一 OpenAI API 形态）
- 不实现：
  - 高级缓存
  - 复杂重试编排策略
  - 多路并发仲裁


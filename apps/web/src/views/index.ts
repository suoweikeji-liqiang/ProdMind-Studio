function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

const SESSION_PHASE_LABELS: Record<string, string> = {
  topic_submitted: '等待输入本轮议题',
  architect_framing: '正在提炼问题定义',
  waiting_user_problem_correction: '等待你修正问题定义',
  objection_generation: '正在生成反方质疑',
  waiting_user_objection_response: '等待你回应质疑',
  grounding: '正在收束本轮结论',
  waiting_round_decision: '等待你决定是否继续本轮',
  waiting_alternative_hypothesis_resolution: '等待你处理替代假设',
  waiting_false_consensus_break: '等待你打破伪共识',
  waiting_tech_escape_response: '等待你回应技术逃逸',
  decision_prompt_submitted: '等待输入决策问题',
  decision_frame_generation: '正在生成决策框架',
  waiting_user_frame_confirmation: '等待你确认决策框架',
  tradeoff_analysis: '正在分析方案权衡',
  waiting_user_priority_adjustment: '等待你调整优先级',
  recommendation_synthesis: '正在生成推荐结论',
  waiting_decision_resolution: '等待你确认决策结论',
  artifact_goal_submitted: '等待输入产物目标',
  artifact_scope_detection: '正在判断产物层级',
  waiting_user_artifact_selection: '等待你选择产物层级',
  draft_generation: '正在生成草稿',
  waiting_user_draft_revision: '等待你修订草稿',
  ready_for_downstream_or_finalize: '可以继续细化或定稿',
  artifact_finalized: '已完成定稿',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  archived: '已归档',
  failed: '失败',
};

const SESSION_ACTION_LABELS: Record<string, string> = {
  'Confirm or correct the problem framing.': '请确认或修正问题定义。',
  'Respond to the objections above.': '请直接回应当前轮中的关键质疑。',
  'Round completed. Send action=round_resolution to continue or switch mode.': '本轮已完成。你可以进入下一轮追问，或切换到其他模式。',
  'Enter the next round topic/correction.': '请输入下一轮要继续验证的追问、反例或修正；仍在当前会话里，不会新建会话。',
  'Respond to the objections without escaping into technology-first claims.': '请正面回应这些质疑，不要把讨论逃到“技术自然会解决”上。',
  'Address the stronger alternative hypothesis before continuing.': '请先处理更强的替代假设，再决定是否继续。',
  'Break the false consensus and state what still does not hold.': '请打破这段伪共识，明确哪些前提仍然不成立。',
  'Confirm or correct the decision frame.': '请确认或修正决策框架。',
  'Review the recommendation, then send action=decision_resolution or switch mode.': '请审阅推荐结论，然后决定收束本模式还是切换模式。',
  'Continue with artifact_goal or switch mode.': '你可以继续发起新的产物目标，或切换模式。',
  'Continue with draft_revision or finalization_note.': '你可以继续修订草稿，或直接补充定稿备注。',
  'Select artifact layer (idea/spec/acceptance/tasks).': '请选择要推进的产物层级：想法、规格、验收或任务。',
};

const SESSION_LAST_STEP_LABELS: Record<string, string> = {
  'architect framing completed': '架构师已完成问题定义',
  'objections generated': '反方质疑已生成',
  'grounding completed': '本轮收束已完成',
  'tech escape detected': '已检测到技术逃逸',
  'alternative hypothesis detected': '已检测到替代假设',
  'false consensus detected': '已检测到伪共识',
  'decision frame generated': '决策框架已生成',
  'tradeoff analysis completed': '权衡分析已完成',
  'decision resolution recorded': '已记录决策结论',
  'requirement goal captured': '已记录产物目标',
  'artifact finalized': '已完成产物定稿',
  'next round initialized': '已初始化下一轮',
  'mode switched to challenge': '已切换到质疑模式',
  'mode switched to decision': '已切换到裁决模式',
  'mode switched to requirement-build': '已切换到需求共建模式',
};

const SESSION_ROLE_LABELS: Record<string, string> = {
  architect: '架构师',
  assassin: '刺客',
  userGhost: '用户幽灵',
  grounder: '锚点官',
  solution: '方案官',
  tradeoff: '权衡官',
  verdict: '裁决官',
  requirements: '需求师',
  'user-representative': '用户代表',
  implementation: '实施工程师',
  acceptance: '验收官',
};

const REQUIREMENT_ARTIFACT_LABELS: Record<string, string> = {
  idea: '想法',
  spec: '规格',
  acceptance: '验收',
  tasks: '任务',
};

function formatKnownLabel(value: string | undefined, labels: Record<string, string>): string {
  if (!value) {
    return '';
  }

  return labels[value] ?? value;
}

function formatRequirementStepLabel(step: string): string | null {
  const match = step.match(/^draft (generated|updated): (idea|spec|acceptance|tasks)$/);
  if (!match) {
    return null;
  }

  const action = match[1] === 'generated' ? '已生成' : '已更新';
  const artifact = REQUIREMENT_ARTIFACT_LABELS[match[2] ?? ''] ?? match[2];
  return `${action}${artifact}草稿`;
}

export function formatSessionPhaseLabel(phase: string | undefined): string {
  return formatKnownLabel(phase, SESSION_PHASE_LABELS);
}

export function formatSessionStatusLabel(status: string | undefined): string {
  return formatKnownLabel(status, SESSION_STATUS_LABELS);
}

export function formatSessionActionLabel(action: string | undefined): string {
  return formatKnownLabel(action, SESSION_ACTION_LABELS);
}

export function formatSessionLastStepLabel(step: string | undefined): string {
  if (!step) {
    return '';
  }

  return formatRequirementStepLabel(step) ?? formatKnownLabel(step, SESSION_LAST_STEP_LABELS);
}

type TimelineSpeakerLike = {
  speaker?: string;
  roleId?: string;
  roleName?: string;
};

export function formatTimelineSpeakerLabel(message: TimelineSpeakerLike): string {
  if (message.speaker === 'user') {
    return '用户';
  }

  const roleKey = message.roleId || message.roleName || '';
  if (roleKey && SESSION_ROLE_LABELS[roleKey]) {
    return SESSION_ROLE_LABELS[roleKey];
  }

  if (message.roleName) {
    return message.roleName;
  }

  return message.speaker === 'system' ? '系统' : '系统';
}

function buildLegacyRoleFallback(roleId: string | undefined): string | null {
  if (roleId === 'assassin') {
    return [
      '## 系统降级说明',
      '本轮“刺客”调用超时，已切换为最小反方质疑，避免流程中断。',
      '',
      '## 最小反方质疑',
      '- 目前还缺少一个最近发生的具体案例，无法判断这是不是高频且高损失的问题。',
      '- 如果不先确认谁最受影响、在哪一步卡住、损失是什么，就容易把管理噪音误判成产品机会。',
      '- 最小验证动作：补充一次真实场景，写清参与角色、卡点、时间损失和当前替代做法。',
    ].join('\n');
  }

  if (roleId === 'userGhost') {
    return [
      '## 系统降级说明',
      '本轮“用户幽灵”调用超时，已切换为最小用户质疑，避免流程中断。',
      '',
      '## 最小用户质疑',
      '- 这件事到底在哪一步最痛？如果只是偶发抱怨，我不会因此改变习惯。',
      '- 你希望我多做哪些输入？如果维护成本更高，我可能继续用现有方式。',
      '- 我需要先看到一个能明显省时的最小版本，否则不会持续使用。',
    ].join('\n');
  }

  if (roleId === 'grounder') {
    return [
      '## 系统降级说明',
      '本轮“锚点官”调用超时，先给出最小收束结论，供你继续下一步。',
      '',
      '## 当前最强假设',
      '1. 当前讨论指向一个真实痛点，但还需要更多一线案例来确认优先级。',
      '',
      '## MVP边界',
      '- 先只验证最痛的一步和最小可用流程，不扩展成完整系统。',
      '',
      '## 本轮证伪检查',
      '当前最重要假设：这个痛点高频、持续，而且值得被一个新流程解决。',
      '如果我是错的：问题只是偶发噪音，或现有工具通过规范就能解决。',
      '最小动作：补一个最近一次真实案例，说明参与角色、卡点、时间损失和当前替代做法。',
    ].join('\n');
  }

  if (roleId === 'architect') {
    return [
      '## 系统降级说明',
      '本轮“架构师”调用超时，先用保底问题定义继续推进。',
      '',
      '## 核心问题',
      '我们还需要确认这是不是一个稳定且值得优先解决的真实阻塞。',
      '',
      '## 目标用户',
      '先聚焦最直接受影响的那类使用者，不要一开始扩大范围。',
      '',
      '## 当前痛点',
      '请补充最近一次卡住推进的具体场景、参与人和损失。',
    ].join('\n');
  }

  return null;
}

function formatTimelineMessageContent(message: { content?: string; roleId?: string }): string {
  const content = String(message.content ?? '');
  if (!content.includes('System fallback') && !content.includes('system fallback:')) {
    return content;
  }

  return buildLegacyRoleFallback(message.roleId) ?? content;
}

const sessionLabelScript = `
    const SESSION_PHASE_LABELS = ${escapeForScript(SESSION_PHASE_LABELS)};
    const SESSION_STATUS_LABELS = ${escapeForScript(SESSION_STATUS_LABELS)};
    const SESSION_ACTION_LABELS = ${escapeForScript(SESSION_ACTION_LABELS)};
    const SESSION_LAST_STEP_LABELS = ${escapeForScript(SESSION_LAST_STEP_LABELS)};
    const SESSION_ROLE_LABELS = ${escapeForScript(SESSION_ROLE_LABELS)};
    const REQUIREMENT_ARTIFACT_LABELS = ${escapeForScript(REQUIREMENT_ARTIFACT_LABELS)};

    function formatKnownLabel(value, labels) {
      if (!value) {
        return '';
      }

      return labels[value] || value;
    }

    function formatRequirementStepLabel(step) {
      const match = String(step || '').match(/^draft (generated|updated): (idea|spec|acceptance|tasks)$/);
      if (!match) {
        return null;
      }

      const action = match[1] === 'generated' ? '已生成' : '已更新';
      const artifact = REQUIREMENT_ARTIFACT_LABELS[match[2]] || match[2];
      return action + artifact + '草稿';
    }

    function formatSessionPhaseLabel(phase) {
      return formatKnownLabel(phase, SESSION_PHASE_LABELS);
    }

    function formatSessionStatusLabel(status) {
      return formatKnownLabel(status, SESSION_STATUS_LABELS);
    }

    function formatSessionActionLabel(action) {
      return formatKnownLabel(action, SESSION_ACTION_LABELS);
    }

    function formatSessionLastStepLabel(step) {
      if (!step) {
        return '';
      }

      return formatRequirementStepLabel(step) || formatKnownLabel(step, SESSION_LAST_STEP_LABELS);
    }

    function formatTimelineSpeakerLabel(message) {
      if (message.speaker === 'user') {
        return '用户';
      }

      const roleKey = message.roleId || message.roleName || '';
      if (roleKey && SESSION_ROLE_LABELS[roleKey]) {
        return SESSION_ROLE_LABELS[roleKey];
      }

      if (message.roleName) {
        return message.roleName;
      }

      return message.speaker === 'system' ? '系统' : '系统';
    }

    function buildLegacyRoleFallback(roleId) {
      if (roleId === 'assassin') {
        return [
          '## 系统降级说明',
          '本轮“刺客”调用超时，已切换为最小反方质疑，避免流程中断。',
          '',
          '## 最小反方质疑',
          '- 目前还缺少一个最近发生的具体案例，无法判断这是不是高频且高损失的问题。',
          '- 如果不先确认谁最受影响、在哪一步卡住、损失是什么，就容易把管理噪音误判成产品机会。',
          '- 最小验证动作：补充一次真实场景，写清参与角色、卡点、时间损失和当前替代做法。'
        ].join('\\n');
      }

      if (roleId === 'userGhost') {
        return [
          '## 系统降级说明',
          '本轮“用户幽灵”调用超时，已切换为最小用户质疑，避免流程中断。',
          '',
          '## 最小用户质疑',
          '- 这件事到底在哪一步最痛？如果只是偶发抱怨，我不会因此改变习惯。',
          '- 你希望我多做哪些输入？如果维护成本更高，我可能继续用现有方式。',
          '- 我需要先看到一个能明显省时的最小版本，否则不会持续使用。'
        ].join('\\n');
      }

      if (roleId === 'grounder') {
        return [
          '## 系统降级说明',
          '本轮“锚点官”调用超时，先给出最小收束结论，供你继续下一步。',
          '',
          '## 当前最强假设',
          '1. 当前讨论指向一个真实痛点，但还需要更多一线案例来确认优先级。',
          '',
          '## MVP边界',
          '- 先只验证最痛的一步和最小可用流程，不扩展成完整系统。',
          '',
          '## 本轮证伪检查',
          '当前最重要假设：这个痛点高频、持续，而且值得被一个新流程解决。',
          '如果我是错的：问题只是偶发噪音，或现有工具通过规范就能解决。',
          '最小动作：补一个最近一次真实案例，说明参与角色、卡点、时间损失和当前替代做法。'
        ].join('\\n');
      }

      if (roleId === 'architect') {
        return [
          '## 系统降级说明',
          '本轮“架构师”调用超时，先用保底问题定义继续推进。',
          '',
          '## 核心问题',
          '我们还需要确认这是不是一个稳定且值得优先解决的真实阻塞。',
          '',
          '## 目标用户',
          '先聚焦最直接受影响的那类使用者，不要一开始扩大范围。',
          '',
          '## 当前痛点',
          '请补充最近一次卡住推进的具体场景、参与人和损失。'
        ].join('\\n');
      }

      return null;
    }

    function formatTimelineMessageContent(message) {
      const content = String((message && message.content) || '');
      if (!content.includes('System fallback') && !content.includes('system fallback:')) {
        return content;
      }

      return buildLegacyRoleFallback(message && message.roleId) || content;
    }
`;

const layout = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - ProdMind Studio</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --surface: #fffdf8;
      --surface-strong: #f7efe0;
      --ink: #1f2933;
      --muted: #5b6671;
      --line: #d7c7aa;
      --accent: #0f766e;
      --accent-soft: #d6f3ef;
      --danger: #991b1b;
      --danger-soft: #fee2e2;
      --success: #166534;
      --success-soft: #dcfce7;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: linear-gradient(180deg, #fbf8f2 0%, #f4f1ea 55%, #ece6d8 100%);
      color: var(--ink);
    }
    a { color: inherit; }
    .skip-link {
      position: absolute;
      left: 16px;
      top: -48px;
      padding: 10px 14px;
      border-radius: 12px;
      background: #1d4d4f;
      color: white;
      z-index: 20;
      transition: top 0.2s ease;
    }
    .skip-link:focus {
      top: 16px;
    }
    nav {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 253, 248, 0.9);
      backdrop-filter: blur(8px);
    }
    nav .brand { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 12px; }
    nav .links { display: flex; gap: 14px; flex-wrap: wrap; }
    main { max-width: 1480px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; }
    h2 { margin: 0 0 12px; font-size: 1.35rem; }
    h3 { margin: 0 0 10px; font-size: 1rem; color: #423b2e; }
    p { line-height: 1.6; color: var(--muted); }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--surface-strong);
      color: #6b4f1d;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
      gap: 20px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    .card {
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 20px;
      box-shadow: 0 18px 45px rgba(56, 47, 33, 0.08);
    }
    .hero .card:first-child {
      padding: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .stack { display: grid; gap: 16px; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status.queued,
    .status.running_challenge,
    .status.running_decision,
    .status.running_assets {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .status.completed {
      background: var(--success-soft);
      color: var(--success);
    }
    .status.failed {
      background: var(--danger-soft);
      color: var(--danger);
    }
    .status.active {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 18px;
    }
    .button,
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 16px;
      border-radius: 999px;
      border: none;
      background: #1d4d4f;
      color: white;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .button.secondary,
    button.secondary {
      background: transparent;
      color: #423b2e;
      border: 1px solid var(--line);
    }
    .section { margin: 24px 0; }
    .section-header { margin-bottom: 12px; }
    .session-toolbar {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px 18px;
      align-items: center;
      margin-bottom: 14px;
    }
    .session-toolbar-main {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .session-toolbar-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
    .session-toolbar-label {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--surface-strong);
      color: #6b4f1d;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .session-toolbar-id {
      margin: 0;
      color: #4f5b66;
      white-space: nowrap;
    }
    label { display: block; font-weight: 600; margin-bottom: 8px; }
    input,
    textarea {
      width: 100%;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      font: inherit;
      background: var(--surface);
      color: var(--ink);
    }
    textarea {
      min-height: 160px;
      resize: vertical;
    }
    .stage-list { display: grid; gap: 10px; }
    .stage {
      border: 1px solid rgba(87, 73, 43, 0.12);
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.55);
    }
    .stage.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
    .stage.completed { border-color: var(--success); background: var(--success-soft); color: var(--success); }
    .stage.failed { border-color: var(--danger); background: var(--danger-soft); color: var(--danger); }
    .callout {
      border-radius: 16px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.66);
    }
    .callout.danger { background: var(--danger-soft); border-color: #fca5a5; color: var(--danger); }
    .callout.success { background: var(--success-soft); border-color: #86efac; color: var(--success); }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .result-section {
      margin: 14px 0;
      padding-top: 14px;
      border-top: 1px solid rgba(87, 73, 43, 0.12);
    }
    .result-section:first-child { border-top: none; padding-top: 0; }
    .conflict-type {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 999px;
      background: #efe1b7;
      color: #7c5c13;
      font-size: 12px;
      margin-right: 8px;
    }
    code {
      background: rgba(15, 23, 42, 0.07);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: Consolas, monospace;
    }
    ul { margin: 8px 0 0; padding-left: 22px; }
    li { margin: 6px 0; color: var(--muted); }
    .small { font-size: 0.92rem; }
    .session-topic-header {
      margin: 8px 0 0;
      max-width: 980px;
      color: #423b2e;
      font-size: 1.02rem;
    }
    .empty {
      padding: 18px;
      border-radius: 16px;
      border: 1px dashed var(--line);
      background: rgba(255, 253, 248, 0.66);
    }
    .session-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
      gap: 18px;
      align-items: start;
    }
    .session-sidebar {
      display: grid;
      gap: 16px;
    }
    .workflow-card {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, rgba(15, 118, 110, 0.08), transparent 40%),
        rgba(255, 253, 248, 0.92);
    }
    .panel-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.12);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 14px;
    }
    .lead {
      margin: 0;
      color: var(--ink);
      font-size: 1.65rem;
      line-height: 1.35;
    }
    .primary-panel {
      padding: 24px;
      border-color: rgba(15, 118, 110, 0.24);
      background:
        linear-gradient(180deg, rgba(214, 243, 239, 0.55), rgba(255, 253, 248, 0.92) 35%),
        rgba(255, 253, 248, 0.92);
    }
    .workflow-compact {
      box-shadow: 0 10px 24px rgba(56, 47, 33, 0.05);
    }
    .workflow-summary-note {
      margin: 0 0 14px;
      color: #6b4f1d;
    }
    .challenge-workbench-shell {
      display: grid;
      gap: 16px;
    }
    .challenge-rail,
    .challenge-topic-rail {
      gap: 16px;
      align-self: start;
    }
    .challenge-rail-note {
      margin: 0 0 12px;
    }
    .challenge-status-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(15, 118, 110, 0.18);
      background: rgba(214, 243, 239, 0.45);
    }
    .challenge-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid rgba(87, 73, 43, 0.12);
      color: #423b2e;
      font-size: 0.92rem;
      font-weight: 600;
    }
    .challenge-rail-section {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(87, 73, 43, 0.12);
    }
    .challenge-history-nav {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    .challenge-history-button {
      width: 100%;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.66);
      color: #423b2e;
      text-align: left;
      font-weight: 600;
    }
    .challenge-history-button.current {
      border-color: rgba(15, 118, 110, 0.35);
      background: rgba(214, 243, 239, 0.55);
      color: var(--accent);
    }
    .challenge-history-button .microcopy {
      display: block;
      margin-top: 6px;
    }
    .challenge-history-preview {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.6);
    }
    .challenge-history-preview summary {
      cursor: pointer;
      font-weight: 700;
      color: #423b2e;
    }
    .challenge-history-preview-body {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .challenge-current-round {
      padding: 24px;
      border-color: rgba(15, 118, 110, 0.18);
      background: rgba(255, 253, 248, 0.78);
    }
    .challenge-history {
      display: grid;
      gap: 12px;
    }
    .challenge-history details {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.58);
    }
    .challenge-history summary {
      cursor: pointer;
      font-weight: 700;
      color: #423b2e;
    }
    .challenge-context-list {
      display: grid;
      gap: 12px;
      margin: 16px 0 0;
    }
    .challenge-context-list[hidden] {
      display: none;
    }
    .challenge-context-item {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.68);
    }
    .challenge-context-item p {
      margin: 0;
      color: var(--ink);
      white-space: pre-wrap;
    }
    .challenge-workbench-composer {
      align-self: start;
    }
    .challenge-center-workbench {
      display: grid;
      gap: 16px;
    }
    .challenge-composer-footer {
      display: grid;
      gap: 12px;
      padding: 0;
    }
    .challenge-composer-footer .actions {
      margin-top: 0;
    }
    .challenge-composer-footer form {
      margin-top: 0;
    }
    .challenge-inline-topic {
      color: #423b2e;
      font-weight: 600;
    }
    .challenge-focus-card {
      display: grid;
      gap: 14px;
      padding: 18px 20px;
      border-radius: 18px;
      border: 1px solid rgba(15, 118, 110, 0.2);
      background: linear-gradient(180deg, rgba(214, 243, 239, 0.34), rgba(255, 253, 248, 0.72));
    }
    .challenge-focus-copy h2 {
      margin-bottom: 6px;
    }
    .challenge-checklist-panel {
      display: grid;
      gap: 12px;
      padding: 16px 18px;
      border-radius: 18px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.68);
    }
    .challenge-checklist-panel strong {
      color: #423b2e;
    }
    .challenge-checklist-list {
      display: grid;
      gap: 10px;
    }
    .challenge-checklist-item {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(87, 73, 43, 0.1);
      background: rgba(255, 255, 255, 0.74);
    }
    .challenge-checklist-item.done {
      border-color: rgba(22, 101, 52, 0.24);
      background: rgba(220, 252, 231, 0.82);
    }
    .challenge-checklist-item.pending {
      border-color: rgba(153, 27, 27, 0.16);
      background: rgba(255, 248, 240, 0.82);
    }
    .challenge-checklist-status {
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
      font-weight: 700;
    }
    .challenge-checklist-detail {
      margin-top: 6px;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .challenge-handoff-summary {
      padding-top: 10px;
      border-top: 1px solid rgba(87, 73, 43, 0.1);
    }
    .challenge-mode-gate-list {
      display: grid;
      gap: 10px;
    }
    .challenge-mode-gate-item {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(87, 73, 43, 0.1);
      background: rgba(255, 255, 255, 0.74);
    }
    .challenge-mode-gate-item.enabled {
      border-color: rgba(15, 118, 110, 0.24);
      background: rgba(214, 243, 239, 0.55);
    }
    .challenge-round-header {
      display: flex;
      gap: 14px;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .challenge-round-toggle {
      flex-shrink: 0;
    }
    .challenge-brief-list {
      display: grid;
      gap: 12px;
    }
    .challenge-brief-section {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.58);
    }
    .challenge-brief-section strong {
      display: block;
      margin-bottom: 6px;
      color: #423b2e;
    }
    .challenge-brief-section div {
      color: var(--muted);
      white-space: pre-wrap;
    }
    .challenge-bullet-list {
      display: grid;
      gap: 10px;
    }
    .challenge-bullet-item {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(87, 73, 43, 0.1);
      background: rgba(255, 255, 255, 0.58);
      color: var(--muted);
    }
    .challenge-bullet-item strong {
      color: #423b2e;
    }
    .challenge-topic-headline {
      display: block;
      margin-top: 4px;
      font-size: 1.05rem;
      color: var(--ink);
      line-height: 1.5;
    }
    .session-sidebar details.card {
      padding: 0;
      overflow: hidden;
    }
    .session-sidebar details.card summary {
      cursor: pointer;
      list-style: none;
      padding: 18px 20px;
      font-weight: 700;
      color: #423b2e;
    }
    .session-sidebar details.card summary::-webkit-details-marker {
      display: none;
    }
    .session-sidebar details.card[open] summary {
      border-bottom: 1px solid rgba(87, 73, 43, 0.12);
    }
    .session-sidebar details.card > div {
      padding: 0 20px 20px;
    }
    body.challenge-mode .session-shell {
      grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.55fr) minmax(320px, 1.05fr);
      gap: 22px;
    }
    body.challenge-mode main {
      padding-top: 18px;
    }
    body.challenge-mode .session-toolbar {
      margin-bottom: 10px;
    }
    body.challenge-mode .session-toolbar-label {
      display: none;
    }
    body.challenge-mode .session-topic-header {
      margin: 0;
      max-width: none;
      font-size: 0.98rem;
    }
    body.challenge-mode .stack {
      display: contents;
    }
    body.challenge-mode.challenge-topic-intake main {
      padding-top: 10px;
    }
    body.challenge-mode.challenge-topic-intake .session-toolbar {
      margin-bottom: 6px;
      gap: 6px 16px;
    }
    body.challenge-mode.challenge-topic-intake .session-topic-header {
      font-size: 0.95rem;
    }
    body.challenge-mode.challenge-topic-intake #challengeInlineTopic {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeCurrentRound {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake .challenge-rail-note {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeHistoryNav {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeHistoryInspector {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeFramingCard {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeConflictCard {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #sharedContextCard {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #draftPanelCard,
    body.challenge-mode.challenge-topic-intake #draftArtifactsCard,
    body.challenge-mode.challenge-topic-intake #finalizedArtifactsCard,
    body.challenge-mode.challenge-topic-intake #sessionTimelinePanel,
    body.challenge-mode.challenge-topic-intake #debugLogPanel {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeWorkbenchShell {
      position: static;
      top: auto;
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
    body.challenge-mode.challenge-topic-intake #challengeTopicBriefRail {
      position: static;
      top: auto;
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
    body.challenge-mode.challenge-topic-intake #challengeHistoryRail,
    body.challenge-mode.challenge-topic-intake #challengeCenterWorkbench,
    body.challenge-mode.challenge-topic-intake #sessionTopicAnchorCard {
      padding: 16px 18px;
    }
    body.challenge-mode.challenge-topic-intake .panel-eyebrow {
      margin-bottom: 10px;
    }
    body.challenge-mode.challenge-topic-intake #challengeStatusStrip {
      gap: 8px;
      padding: 10px 12px;
    }
    body.challenge-mode.challenge-topic-intake .challenge-status-pill {
      gap: 6px;
      padding: 5px 8px;
      font-size: 0.84rem;
    }
    body.challenge-mode.challenge-topic-intake .challenge-rail-section {
      margin-top: 12px;
      padding-top: 12px;
    }
    body.challenge-mode.challenge-topic-intake #challengeModeSwitcherBlock h3,
    body.challenge-mode.challenge-topic-intake #challengeModeSwitcherHint {
      display: none;
    }
    body.challenge-mode.challenge-topic-intake #challengeModeSwitcherBlock .mode-switcher {
      margin: 0;
      gap: 8px;
    }
    body.challenge-mode.challenge-topic-intake #challengeModeSwitcherBlock .mode-pill {
      min-height: 36px;
      padding: 0 12px;
    }
    body.challenge-mode.challenge-topic-intake #challengeFocusCard {
      gap: 8px;
      padding: 12px 14px;
    }
    body.challenge-mode.challenge-topic-intake #challengeFocusTitle {
      margin-bottom: 2px;
      font-size: 1.12rem;
    }
    body.challenge-mode.challenge-topic-intake #challengeFocusReason {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.45;
    }
    body.challenge-mode.challenge-topic-intake #challengeFocusActions {
      gap: 8px;
    }
    body.challenge-mode.challenge-topic-intake #challengeFocusActions button {
      min-height: 38px;
      padding: 0 14px;
    }
    body.challenge-mode.challenge-topic-intake #challengeComposerFooter {
      gap: 10px;
    }
    body.challenge-mode.challenge-topic-intake #sessionComposerLabel {
      margin-bottom: 6px;
    }
    body.challenge-mode.challenge-topic-intake #sessionMessageInput {
      min-height: 96px;
    }
    body.challenge-mode.challenge-topic-intake #sessionStatusBanner {
      padding: 12px 14px;
    }
    body.challenge-mode.challenge-topic-intake #sessionTopicAnchorCard h2 {
      margin-bottom: 10px;
    }
    body.challenge-mode.challenge-topic-intake #sessionTopicAnchorCard .challenge-brief-section {
      padding: 12px 14px;
    }
    body.challenge-mode.challenge-topic-intake #sessionTopicAnchorCard .challenge-brief-section strong {
      margin-bottom: 4px;
    }
    body.challenge-mode #challengeWorkbenchShell {
      grid-column: 1;
      grid-row: 1 / span 3;
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding-right: 4px;
      display: block;
    }
    body.challenge-mode #challengeWorkbenchComposer {
      grid-column: 2;
      grid-row: 1;
      align-self: start;
    }
    body.challenge-mode #challengeInlineTopic {
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      font-size: 0.96rem;
      line-height: 1.45;
    }
    body.challenge-mode #challengeFocusCard {
      gap: 10px;
      padding: 14px 16px;
      border-radius: 16px;
    }
    body.challenge-mode #challengeCurrentRound {
      padding: 18px 20px;
    }
    body.challenge-mode #challengeComposerFooter {
      position: static;
      border: none;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
    body.challenge-mode #sessionMessageInput {
      min-height: 112px;
    }
    body.challenge-mode #sessionWorkflowSummary {
      display: none;
    }
    body.challenge-mode #sessionTimelinePanel {
      grid-column: 2;
      grid-row: 2;
      padding-bottom: 0;
    }
    body.challenge-mode #debugLogPanel {
      grid-column: 2;
      grid-row: 3;
    }
    body.challenge-mode #challengeTopicBriefRail {
      grid-column: 3;
      grid-row: 1 / span 3;
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding-right: 4px;
      display: grid;
    }
    body.challenge-mode #sessionTimelinePanel {
      padding-bottom: 0;
    }
    .action-summary {
      margin-top: 14px;
      border-style: dashed;
    }
    .choice-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .choice-grid button {
      background: rgba(255, 253, 248, 0.92);
      color: #423b2e;
      border: 1px solid rgba(87, 73, 43, 0.18);
      box-shadow: none;
    }
    .choice-grid button.primary-choice {
      background: #1d4d4f;
      color: white;
      border-color: transparent;
    }
    .choice-grid button.active {
      background: rgba(29, 77, 79, 0.14);
      border-color: rgba(29, 77, 79, 0.42);
      color: #173d3e;
    }
    .inline-form {
      display: grid;
      gap: 12px;
    }
    .developer-tools {
      padding: 0;
      overflow: hidden;
    }
    .developer-tools summary {
      cursor: pointer;
      list-style: none;
      padding: 18px 20px;
      font-weight: 700;
      color: #423b2e;
    }
    .developer-tools summary::-webkit-details-marker {
      display: none;
    }
    .developer-tools[open] summary {
      border-bottom: 1px solid rgba(87, 73, 43, 0.12);
    }
    .developer-tools-body {
      padding: 0 20px 20px;
    }
    .mode-switcher {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 16px 0;
    }
    .mode-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--surface-strong);
      border: 1px solid var(--line);
      color: #423b2e;
      font-weight: 600;
    }
    .mode-pill.active {
      background: var(--accent-soft);
      border-color: rgba(15, 118, 110, 0.4);
      color: var(--accent);
    }
    .timeline {
      display: grid;
      gap: 12px;
    }
    .timeline-item {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.58);
    }
    .timeline-item strong {
      display: block;
      margin-bottom: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .microcopy {
      color: #6b4f1d;
      font-size: 0.92rem;
    }
    .debug-log-list {
      display: grid;
      gap: 10px;
      max-height: 320px;
      overflow: auto;
    }
    .debug-log-item {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.58);
    }
    .debug-log-item strong {
      display: block;
      margin-bottom: 6px;
    }
    .debug-log-detail {
      margin-top: 8px;
      padding: 10px;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.05);
      font-family: Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #423b2e;
    }
    @media (max-width: 1279px) {
      body.challenge-mode .session-shell {
        grid-template-columns: minmax(0, 1.45fr) minmax(300px, 1fr);
      }
      body.challenge-mode #challengeWorkbenchShell {
        grid-column: 1 / -1;
        grid-row: auto;
        position: static;
        max-height: none;
        overflow: visible;
        padding-right: 0;
      }
      body.challenge-mode #challengeWorkbenchComposer {
        grid-column: 1;
        grid-row: auto;
        position: static;
      }
      body.challenge-mode #sessionTimelinePanel,
      body.challenge-mode #debugLogPanel {
        grid-column: 1;
        grid-row: auto;
      }
      body.challenge-mode #challengeTopicBriefRail {
        grid-column: 2;
        grid-row: auto;
        position: static;
        max-height: none;
        overflow: visible;
        padding-right: 0;
      }
    }
    @media (max-width: 960px) {
      nav { flex-direction: column; align-items: flex-start; }
      .hero { grid-template-columns: 1fr; }
      .session-shell { grid-template-columns: 1fr; }
      body.challenge-mode .stack { display: grid; }
      body.challenge-mode .session-shell {
        grid-template-columns: 1fr;
      }
      body.challenge-mode #challengeWorkbenchShell,
      body.challenge-mode #challengeWorkbenchComposer,
      body.challenge-mode #sessionTimelinePanel,
      body.challenge-mode #debugLogPanel,
      body.challenge-mode #challengeTopicBriefRail {
        grid-column: auto;
        grid-row: auto;
        position: static;
        max-height: none;
        overflow: visible;
        padding-right: 0;
      }
      .challenge-composer-footer {
        position: static;
      }
      .session-toolbar {
        grid-template-columns: 1fr;
      }
      .session-toolbar-actions {
        justify-content: flex-start;
      }
      .challenge-round-header {
        flex-direction: column;
      }
      main { padding: 24px 16px 40px; }
    }
  </style>
  <script src="/static/md.js"></script>
</head>
<body>
  <a class="skip-link" href="#mainContent">跳到主要内容</a>
  <nav>
    <div class="brand">ProdMind Studio</div>
    <div class="links">
      <a href="/">首页</a>
      <a href="/sessions">会话历史</a>
    </div>
  </nav>
  <main id="mainContent" tabindex="-1">${content}</main>
</body>
</html>`;

export const renderHome = () => layout('Home', `
  <section class="hero">
    <div class="card">
      <div class="eyebrow">中文多轮思维工具</div>
      <h1>先明确议题，再进入多角色、多轮的严肃思考。</h1>
      <p>
        ProdMind Studio 现在以会话为中心，而不是一次性流程页。你先输入议题，
        再在同一个会话里手动切换 <code>质疑模式</code>、<code>裁决模式</code>、
        <code>需求共建模式</code> 三种思考模式。
      </p>
      <form id="topicForm" class="stack">
        <div>
          <label for="topic">请输入本次要讨论的议题</label>
          <textarea
            id="topic"
            name="topic"
            required
            placeholder="例如：我们是否应该把现有 CLI 产品迁移成一个可部署给公司内部使用的中文 Web 思维工具？"
          ></textarea>
        </div>
        <p class="small">这是严肃的思维工具。一个会话只服务一个主议题，后续通过模式切换推进思考。</p>
        <div class="actions">
          <button type="submit">开启会话</button>
          <a class="button secondary" href="/sessions">查看会话历史</a>
        </div>
        <div id="homeError" class="small" style="color: var(--danger);"></div>
      </form>
    </div>
    <div class="stack">
      <div class="card">
        <h2>你会得到什么</h2>
        <ul>
          <li>围绕同一个议题保留完整时间线和模式切换痕迹</li>
          <li>多角色可见发言，帮助团队从不同角度思考问题</li>
          <li>右侧草稿与定稿区域，方便逐步沉淀结构化产物</li>
        </ul>
      </div>
      <div class="card">
        <h2>这一版不做什么</h2>
        <ul>
          <li>不做协同编辑，也不做复杂权限系统</li>
          <li>不把三种模式串成固定流水线</li>
          <li>不把完整思考过程压缩成一次性结果页</li>
        </ul>
      </div>
    </div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    document.getElementById('topicForm').onsubmit = async (event) => {
      event.preventDefault();
      const topic = event.target.topic.value;
      document.getElementById('homeError').textContent = '';

      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic })
        });
        const data = await response.json();
        if (!response.ok) {
          document.getElementById('homeError').innerHTML = escapeHtml(data.error || '无法创建会话。');
          return;
        }
        window.location.href = '/sessions/' + encodeURIComponent(data.session.sessionId);
      } catch (error) {
        document.getElementById('homeError').innerHTML = escapeHtml(error.message);
      }
    };
  </script>
`);

export const renderSessionPage = (sessionId: string) => layout('Session', `
  <section class="section-header session-toolbar">
    <div class="session-toolbar-main">
      <span class="session-toolbar-label">会话主场</span>
      <p class="session-toolbar-id">会话编号：<code>${escapeHtml(sessionId)}</code></p>
    </div>
    <div class="session-toolbar-actions">
      <a id="sessionExportLink" class="button secondary" href="/api/sessions/${escapeHtml(sessionId)}/export.md">导出 Markdown</a>
    </div>
    <p id="sessionTopicHeader" class="small session-topic-header">正在读取当前议题…</p>
  </section>
  <section class="session-shell">
    <div class="stack">
      <section id="challengeWorkbenchShell" class="challenge-workbench-shell" style="display:none;">
        <div id="challengeHistoryRail" class="card challenge-rail">
          <div class="panel-eyebrow">历史 / 导航</div>
          <p class="small challenge-rail-note">左栏只负责轮次导航和历史回看，不抢当前输入焦点。</p>
          <div id="challengeStatusStrip" class="challenge-status-strip empty">
            当前轮状态会在这里展开，避免你先读一大块摘要再去找操作入口。
          </div>
          <div id="challengeHistoryNav" class="challenge-history-nav">
            <div class="empty">完成第一轮后，这里会出现轮次导航。</div>
          </div>
          <details id="challengeHistoryInspector" class="challenge-history-preview" open>
            <summary>历史回看</summary>
            <div id="challengeHistoryPreview" class="empty">点任意已完成轮次后，这里只显示摘要，不会切走当前输入。</div>
          </details>
          <div id="challengeModeSwitcherBlock" class="challenge-rail-section">
            <h3>模式切换</h3>
            <p class="small" id="challengeModeSwitcherHint">先处理完当前关键动作，再考虑切换模式。</p>
            <div class="mode-switcher">
              <button class="mode-pill" type="button" data-mode="challenge">质疑模式</button>
              <button class="mode-pill" type="button" data-mode="decision">裁决模式</button>
              <button class="mode-pill" type="button" data-mode="requirement-build">需求共建模式</button>
            </div>
          </div>
        </div>
      </section>
      <div id="challengeWorkbenchComposer" class="challenge-workbench-composer">
        <div class="card primary-panel challenge-center-workbench" id="challengeCenterWorkbench">
          <div class="panel-eyebrow">当前轮工作台</div>
          <div id="challengeInlineTopic" class="callout challenge-inline-topic">议题会在这里常驻，避免你进入工作区后忘记当前在讨论什么。</div>
          <div id="challengeFocusCard" class="challenge-focus-card">
            <div class="challenge-focus-copy">
              <h2 id="challengeFocusTitle">继续推进</h2>
              <p id="challengeFocusReason" class="small">系统正在整理当前最关键的下一步。</p>
            </div>
            <div id="challengeFocusActions" class="choice-grid"></div>
          </div>
          <div id="challengeChecklistPanel" class="challenge-checklist-panel">
            <strong>本步过关条件</strong>
            <div class="empty" style="margin-top:10px;">加载完成后，这里会显示这一轮必须补齐的输入门槛和切模条件。</div>
          </div>
          <div class="challenge-current-round" id="challengeCurrentRound">
            <div class="challenge-round-header">
              <div>
                <h2 id="challengeCurrentRoundHeadline">当前轮上下文</h2>
                <p id="challengeCurrentRoundHint" class="small">默认先看摘要；如果你需要完整上下文，再展开。</p>
              </div>
              <button id="challengeRoundSummaryToggle" class="secondary challenge-round-toggle" type="button">展开完整上下文</button>
            </div>
            <div id="challengeCurrentRoundSummary" class="callout">加载完成后，这里会收束出当前轮的核心上下文。</div>
            <div id="challengeCurrentContext" class="challenge-context-list" hidden>
              <div class="empty">当前轮上下文会贴在输入区旁边，避免你反复回到上方查找。</div>
            </div>
          </div>
          <div id="challengeComposerFooter" class="challenge-composer-footer">
            <div id="challengeProblemCorrectionForm" class="card" style="display:none;">
              <div class="stack">
                <div class="actions" style="justify-content:space-between;margin-top:0;">
                  <strong>问题修正表单</strong>
                  <button id="challengeProblemCorrectionAssist" type="button" class="secondary">智能整理</button>
                </div>
                <div class="stack">
                  <div>
                    <label for="challengeProblemDefinitionInput">问题定义</label>
                    <input id="challengeProblemDefinitionInput" name="problemDefinition" type="text" placeholder="一句话写清真正被卡住的是什么，而不是你想做什么方案。" />
                  </div>
                  <div>
                    <label for="challengeScenarioInput">场景/行业</label>
                    <input id="challengeScenarioInput" name="scenario" type="text" placeholder="谁在什么情境里被这个问题卡住，例如团队类型、行业、协作环境。" />
                  </div>
                  <div data-list-field="topPains">
                    <label>核心痛点</label>
                    <div id="challengeProblemTopPainsList" class="stack">
                      <div class="inline-form">
                        <input name="topPains" type="text" placeholder="写一条高频、可感知、能说明损失的痛点。" />
                        <button type="button" class="secondary" data-remove-list="topPains">删除</button>
                      </div>
                      <div class="inline-form">
                        <input name="topPains" type="text" placeholder="写一条高频、可感知、能说明损失的痛点。" />
                        <button type="button" class="secondary" data-remove-list="topPains">删除</button>
                      </div>
                      <div class="inline-form">
                        <input name="topPains" type="text" placeholder="写一条高频、可感知、能说明损失的痛点。" />
                        <button type="button" class="secondary" data-remove-list="topPains">删除</button>
                      </div>
                    </div>
                    <div class="actions" style="margin-top:10px;"><button type="button" class="secondary" data-add-list="topPains">新增一条痛点</button></div>
                  </div>
                  <div data-list-field="constraints">
                    <label>约束</label>
                    <div id="challengeProblemConstraintsList" class="stack">
                      <div class="inline-form">
                        <input name="constraints" type="text" placeholder="写一条不能回避的时间、资源、组织或维护限制。" />
                        <button type="button" class="secondary" data-remove-list="constraints">删除</button>
                      </div>
                    </div>
                    <div class="actions" style="margin-top:10px;"><button type="button" class="secondary" data-add-list="constraints">新增一条约束</button></div>
                  </div>
                  <div>
                    <label for="challengeProblemNotesInput">补充说明</label>
                    <textarea id="challengeProblemNotesInput" name="notes" placeholder="可选：补充背景、例子或你暂时拿不准但不想丢掉的信息。"></textarea>
                  </div>
                </div>
              </div>
            </div>
            <form id="sessionMessageForm" class="stack">
            <input id="sessionMessageAction" name="action" type="hidden" value="" />
            <input id="sessionMessageFocusAction" name="focusAction" type="hidden" value="" />
            <div id="sessionMessageInputWrap">
              <label id="sessionComposerLabel" for="sessionMessageInput">当前模式输入</label>
              <textarea
                id="sessionMessageInput"
                name="content"
                required
                placeholder="继续在当前模式下推进这一议题。例如：补充一个事实、提出一个反例、要求做出取舍，或者要求整理成结构化草稿。"
              ></textarea>
            </div>
            <div class="actions" id="sessionMessageActions">
              <button id="sessionSendButton" type="submit">发送本轮输入</button>
            </div>
            <div id="sessionComposerError" class="small" style="color: var(--danger);"></div>
          </form>
          <div id="sessionPrimaryActionButtons" class="choice-grid"></div>
          <form id="finalizeArtifactsForm" class="inline-form" style="display:none;">
            <div>
              <label for="finalizeNote">本次定稿备注</label>
              <input
                id="finalizeNote"
                name="note"
                type="text"
                placeholder="例如：baseline / expanded acceptance"
              />
            </div>
            <div class="actions" style="margin-top:0;">
              <button id="finalizeArtifactsButton" type="submit">生成新版本</button>
            </div>
            <div id="finalizeArtifactsError" class="small" style="color: var(--danger);"></div>
            <p class="small">只在需求共建模式下启用，且会保留所有历史版本。</p>
          </form>
          <div id="sessionStatusBanner" class="empty" aria-live="polite">切换模式、发送消息和定稿后，结果会立即刷新到时间线和右栏。</div>
          <p class="small">质疑模式通常需要 20-60 秒，因为系统会汇总多个角色的判断；完成后页面会自动刷新。</p>
          </div>
        </div>
      </div>
      <div class="card workflow-card workflow-compact" id="sessionWorkflowSummary">
        <div class="panel-eyebrow">会话概览</div>
        <h2>当前状态</h2>
        <p class="workflow-summary-note small">这里只保留阶段、阻塞和模式建议，不再抢占你的主操作区域。</p>
        <div id="sessionMeta" class="empty">正在加载会话状态...</div>
        <div id="sessionPhaseBanner" class="callout" style="margin-top:10px;display:none;" aria-live="polite">
          <strong id="sessionPhaseLabel"></strong>
          <p id="sessionInteractionState" class="small" style="margin:4px 0 0;color:var(--accent);"></p>
          <p id="sessionLastStep" class="small" style="margin:4px 0 0;"></p>
          <p id="sessionHandoffHint" class="small" style="color:var(--accent);margin:4px 0 0;"></p>
          <p id="sessionModeWarning" class="small" style="color:var(--danger);margin:4px 0 0;"></p>
          <p id="sessionRollbackHint" class="small" style="margin:4px 0 0;"></p>
        </div>
        <div id="sessionTaskSummary" class="callout action-summary">
          <strong>系统正在读取当前步骤…</strong>
          <p class="small" style="margin:4px 0 0;">加载完成后，这里会告诉你当前只需要做哪一个动作。</p>
        </div>
        <div class="mode-switcher" id="sessionModeSwitcher">
          <button class="mode-pill" type="button" data-mode="challenge">质疑模式</button>
          <button class="mode-pill" type="button" data-mode="decision">裁决模式</button>
          <button class="mode-pill" type="button" data-mode="requirement-build">需求共建模式</button>
        </div>
        <p class="small" id="sessionModeSwitcherHint">模式切换后会持续生效，直到你再次切换。</p>
      </div>
      <div class="card" id="sessionTimelinePanel">
        <h2>完整时间线</h2>
        <div id="timeline" class="timeline">
          <div class="timeline-item">
            <strong>等待消息</strong>
            <span class="microcopy">后续这里会显示用户消息、多角色发言和模式切换事件。</span>
          </div>
        </div>
      </div>
      <details class="card developer-tools" id="debugLogPanel">
        <summary>开发诊断</summary>
        <div class="developer-tools-body">
          <p class="small">这里会显示按钮点击、请求开始、响应状态、异常和浏览器脚本错误。</p>
          <div id="debugLogList" class="debug-log-list">
            <div class="empty">正在等待前端事件...</div>
          </div>
        </div>
      </details>
    </div>
    <div class="session-sidebar" id="challengeTopicBriefRail">
      <div class="card" id="sessionTopicAnchorCard">
        <h2>议题锚点</h2>
        <div id="challengeTopicAnchorPanel" class="empty">这里会持续提醒你当前到底在讨论什么。</div>
      </div>
      <div class="card" id="challengeFramingCard">
        <h2 id="challengeFramingHeading">当前问题定义</h2>
        <div id="challengeFramingPanel" class="empty">架构师最新 framing 和你的最近立场会显示在这里。</div>
      </div>
      <div class="card" id="sharedContextCard">
        <h2>共享底稿</h2>
        <div id="sharedContextPanel" class="empty">这里会持续显示本会话已确认事实、硬约束和参考资料。</div>
      </div>
      <div class="card" id="challengeConflictCard">
        <h2 id="challengeConflictHeading">当前关键分歧</h2>
        <div id="challengeConflictPanel" class="empty">这一步最需要正面回应的分歧会显示在这里。</div>
      </div>
      <details class="card" id="draftPanelCard">
        <summary>当前模式草稿</summary>
        <div id="draftPanel" class="empty">当前模式的草稿摘要、定稿版本和结构化产物会显示在这里。</div>
      </details>
      <details class="card" id="draftArtifactsCard">
        <summary>草稿产物</summary>
        <div id="draftArtifactsPanel" class="empty">当前模式还没有结构化草稿产物。</div>
      </details>
      <details class="card" id="finalizedArtifactsCard">
        <summary>已定稿版本</summary>
        <div id="finalizedArtifactsPanel" class="empty">当前模式还没有定稿版本。</div>
      </details>
    </div>
  </section>
  <script>
    const sessionPath = '/api/sessions/${escapeHtml(sessionId)}';
    const sessionModePath = '/api/sessions/${escapeHtml(sessionId)}/mode';
    const sessionMessagePath = '/api/sessions/${escapeHtml(sessionId)}/messages';
    const sessionProblemCorrectionAssistPath = '/api/sessions/${escapeHtml(sessionId)}/challenge/problem-correction-assist';
    const sessionFinalizePath = '/api/sessions/${escapeHtml(sessionId)}/artifacts/finalize';
    const sessionExportPath = '/api/sessions/${escapeHtml(sessionId)}/export.md';
    const debugLogs = [];
    let latestSessionData = null;
    let latestChallengeModel = null;
    let challengeContextExpanded = false;
    let challengeTopicBootstrapAttempted = false;
    let challengeTopicBootstrapInFlight = false;

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function syncExportLink() {
      const exportLink = document.getElementById('sessionExportLink');
      if (!exportLink) {
        return;
      }

      const exportUrl = new URL(sessionExportPath, window.location.origin);
      const currentQuery = new URLSearchParams(window.location.search);
      const projectPath = currentQuery.get('projectPath');
      if (projectPath) {
        exportUrl.searchParams.set('projectPath', projectPath);
      }

      exportLink.href = exportUrl.pathname + exportUrl.search;
    }

${sessionLabelScript}

    function modeLabel(mode) {
      if (mode === 'challenge') return '质疑模式';
      if (mode === 'decision') return '裁决模式';
      if (mode === 'requirement-build') return '需求共建模式';
      return String(mode || '未知模式');
    }

    function interactionStateLabel(interactionState) {
      if (interactionState === 'running_ai_step') return '系统正在处理这一轮输入';
      if (interactionState === 'ready_to_finalize') return '当前结果已到可收束或定稿状态';
      if (interactionState === 'blocked') return '当前流程被阻塞，必须先处理当前轮中的关键分歧';
      if (interactionState === 'completed') return '当前会话已完成';
      if (interactionState === 'idle') return '当前会话尚未开始';
      return '系统正在等待你的下一步输入';
    }

    function formatTimestamp(value) {
      if (!value) {
        return '';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }

    function buildClientSessionTaskModel(session, _artifacts, modeState) {
      if (!session) {
        return {
          headline: '正在读取当前步骤…',
          primaryInputAction: null,
          primaryButtonLabel: null,
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      const challengeMessages = modeState && Array.isArray(modeState.messages) ? modeState.messages : [];
      const completedChallengeRounds = session.currentMode === 'challenge'
        ? countCompletedChallengeRounds(buildChallengeRounds(challengeMessages))
        : 0;

      if (session.currentPhase === 'waiting_user_problem_correction') {
        return {
          headline: session.requiredUserAction || '请确认或修正问题定义。',
          primaryInputAction: 'problem_correction',
          primaryButtonLabel: '提交问题修正',
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      if (
        session.currentPhase === 'waiting_user_objection_response'
        || session.currentPhase === 'waiting_tech_escape_response'
        || session.currentPhase === 'waiting_alternative_hypothesis_resolution'
        || session.currentPhase === 'waiting_false_consensus_break'
      ) {
        return {
          headline: session.requiredUserAction || '请回应当前质疑。',
          primaryInputAction: 'objection_response',
          primaryButtonLabel: '提交回应',
          explicitChoices: [],
          showModeSwitcher: false,
        };
      }

      if (session.currentPhase === 'waiting_round_decision') {
        const latestChallengeHandoff = session.latestChallengeHandoff || null;
        const decisionReady = Boolean(latestChallengeHandoff && latestChallengeHandoff.roundStatus && latestChallengeHandoff.roundStatus.matureEnoughForDecision);
        const requirementBuildReady = Boolean(latestChallengeHandoff && latestChallengeHandoff.roundStatus && latestChallengeHandoff.roundStatus.matureEnoughForRequirementBuild);
        if (session.currentMode === 'challenge' && completedChallengeRounds >= CLIENT_CHALLENGE_MAX_ROUNDS) {
          return {
            headline: session.requiredUserAction || CLIENT_CHALLENGE_MAX_ROUNDS_ERROR,
            primaryInputAction: null,
            primaryButtonLabel: null,
            explicitChoices: [
              ...(decisionReady ? [{ label: '切到裁决模式', actionValue: 'switch:decision' }] : []),
              ...(requirementBuildReady ? [{ label: '进入需求共建', actionValue: 'switch:requirement-build' }] : []),
            ],
            showModeSwitcher: true,
          };
        }

        return {
          headline: session.requiredUserAction || '本轮已完成，请决定下一步。',
          primaryInputAction: null,
          primaryButtonLabel: null,
          explicitChoices: [
            { label: '进入下一轮追问', actionValue: 'round_resolution' },
            ...(decisionReady ? [{ label: '切到裁决模式', actionValue: 'switch:decision' }] : []),
            ...(requirementBuildReady ? [{ label: '进入需求共建', actionValue: 'switch:requirement-build' }] : []),
          ],
          showModeSwitcher: true,
        };
      }

      if (session.currentPhase === 'waiting_user_frame_confirmation') {
        return {
          headline: session.requiredUserAction || '请确认或修正决策框架。',
          primaryInputAction: 'frame_correction',
          primaryButtonLabel: '提交框架修正',
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      if (session.currentPhase === 'waiting_user_priority_adjustment') {
        return {
          headline: session.requiredUserAction || '请调整优先级或权重。',
          primaryInputAction: 'priority_adjustment',
          primaryButtonLabel: '提交优先级调整',
          explicitChoices: [],
          showModeSwitcher: false,
        };
      }

      if (session.currentPhase === 'waiting_decision_resolution') {
        return {
          headline: session.requiredUserAction || '请确认推荐结论的下一步。',
          primaryInputAction: null,
          primaryButtonLabel: null,
          explicitChoices: [
            { label: '进入需求共建', actionValue: 'switch:requirement-build' },
            { label: '继续讨论裁决', actionValue: 'decision_resolution' },
          ],
          showModeSwitcher: true,
        };
      }

      if (session.currentPhase === 'waiting_user_artifact_selection') {
        return {
          headline: session.requiredUserAction || '请选择要推进的产物层级。',
          primaryInputAction: null,
          primaryButtonLabel: null,
          explicitChoices: [
            { label: '想法', actionValue: 'idea' },
            { label: '规格', actionValue: 'spec' },
            { label: '验收', actionValue: 'acceptance' },
            { label: '任务', actionValue: 'tasks' },
          ],
          showModeSwitcher: false,
        };
      }

      if (session.currentPhase === 'waiting_user_draft_revision') {
        return {
          headline: session.requiredUserAction || '请审阅并修订草稿。',
          primaryInputAction: 'draft_revision',
          primaryButtonLabel: '提交草稿修订',
          explicitChoices: [],
          showModeSwitcher: false,
        };
      }

      if (session.currentPhase === 'ready_for_downstream_or_finalize') {
        return {
          headline: session.requiredUserAction || '你可以继续修订草稿，或直接定稿。',
          primaryInputAction: 'draft_revision',
          primaryButtonLabel: '继续修订草稿',
          explicitChoices: [
            { label: '生成新版本', actionValue: 'finalize' },
          ],
          showModeSwitcher: true,
        };
      }

      if (session.currentPhase === 'artifact_finalized') {
        return {
          headline: session.requiredUserAction || '当前产物已定稿。',
          primaryInputAction: 'artifact_goal',
          primaryButtonLabel: '发起新产物目标',
          explicitChoices: [
            { label: '切回裁决模式', actionValue: 'switch:decision' },
          ],
          showModeSwitcher: true,
        };
      }

      if (session.currentMode === 'decision' && session.currentPhase === 'decision_prompt_submitted') {
        return {
          headline: session.requiredUserAction || '请输入你的决策问题。',
          primaryInputAction: 'decision_problem',
          primaryButtonLabel: '开始裁决分析',
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      if (session.currentMode === 'requirement-build' && session.currentPhase === 'artifact_goal_submitted') {
        return {
          headline: session.requiredUserAction || '请输入你要沉淀的产物目标。',
          primaryInputAction: 'artifact_goal',
          primaryButtonLabel: '开始生成产物',
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      if (session.currentMode === 'challenge' && session.currentPhase === 'topic_submitted') {
        const hasExistingRounds = buildChallengeRounds(modeState && Array.isArray(modeState.messages) ? modeState.messages : []).length > 0;
        return {
          headline: session.requiredUserAction || (
            hasExistingRounds
              ? '\u8bf7\u8f93\u5165\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u7684\u8ffd\u95ee\u3001\u53cd\u4f8b\u6216\u4fee\u6b63\uff1b\u4ecd\u5728\u5f53\u524d\u4f1a\u8bdd\u91cc\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002'
              : '\u8bf7\u8f93\u5165\u4f60\u7684\u8bae\u9898\u6216\u60f3\u6cd5\u3002'
          ),
          primaryInputAction: 'raw_topic',
          primaryButtonLabel: hasExistingRounds ? '\u53d1\u8d77\u4e0b\u4e00\u8f6e\u8ffd\u95ee' : '\u5f00\u59cb\u8d28\u7591',
          explicitChoices: [],
          showModeSwitcher: true,
        };
      }

      return {
        headline: session.requiredUserAction || '继续推进当前步骤。',
        primaryInputAction: null,
        primaryButtonLabel: null,
        explicitChoices: [],
        showModeSwitcher: true,
      };
    }

    const challengeRoleLabels = {
      architect: '架构师',
      assassin: '刺客',
      userGhost: '用户幽灵',
      grounder: '锚点官',
    };
    const CLIENT_CHALLENGE_MIN_RESPONSE_LENGTH = 50;
    const CLIENT_CHALLENGE_MAX_ROUNDS = 5;
    const CLIENT_CHALLENGE_MIN_RESPONSE_ERROR = '当前阶段的回应至少 50 字，避免一句话跳过关键质疑。';
    const CLIENT_CHALLENGE_MAX_ROUNDS_ERROR = '已达到质疑模式最大 5 轮，请改为切换模式或回看本轮结论。';
    const CLIENT_CHALLENGE_INTERRUPT_PHASES = new Set([
      'waiting_alternative_hypothesis_resolution',
      'waiting_false_consensus_break',
      'waiting_tech_escape_response',
    ]);

    function isChallengeRoleMessage(message) {
      return message && message.speaker === 'role' && message.roleId && challengeRoleLabels[message.roleId];
    }

    function buildChallengeRounds(messages) {
      const rounds = [];
      let currentRound = [];

      for (const message of messages || []) {
        if (!isChallengeRoleMessage(message)) {
          continue;
        }

        const currentRoundClosed = currentRound.some((item) => item.roleId === 'grounder');
        const currentRoundHasArchitect = currentRound.some((item) => item.roleId === 'architect');
        if (message.roleId === 'architect' && currentRound.length > 0 && (currentRoundClosed || currentRoundHasArchitect)) {
          rounds.push(currentRound);
          currentRound = [];
        }

        currentRound.push({
          roleId: message.roleId,
          roleName: message.roleName || challengeRoleLabels[message.roleId] || message.roleId,
          content: message.content || '',
          timestamp: message.timestamp || '',
        });
      }

      if (currentRound.length > 0) {
        rounds.push(currentRound);
      }

      return rounds;
    }

    function countCompletedChallengeRounds(rounds) {
      return (rounds || []).filter((round) => Array.isArray(round) && round.some((item) => item.roleId === 'grounder')).length;
    }

    function summarizeChallengeText(value, maxLength = 96) {
      const normalized = String(value || '')
        .replaceAll(/\\r/g, '')
        .split('\\n')
        .map((line) => line.replaceAll(/^#+\\s*/g, '').replaceAll(/^-\\s*/g, '').trim())
        .find(Boolean) || '';

      if (normalized.length <= maxLength) {
        return normalized;
      }

      return normalized.slice(0, maxLength - 1) + '…';
    }

    function summarizeChallengeRound(items) {
      return (items || []).map((item) => item.roleName + '：' + summarizeChallengeText(item.content)).join('\\n');
    }

    function latestChallengeMessageBySpeaker(messages, speaker, roleId) {
      for (let index = (messages || []).length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (!message || message.speaker !== speaker) {
          continue;
        }
        if (!roleId || message.roleId === roleId) {
          return message;
        }
      }

      return null;
    }

    function createChallengeFocusAction(kind, label, template, inputLabel, placeholder) {
      return { kind, label, template, inputLabel, placeholder };
    }

    function buildClientChallengeFocusCard(session, currentItems, hasExistingRounds, completedRoundCount) {
      const architectSummary = (currentItems || []).find((item) => item.roleId === 'architect');
      const objections = (currentItems || []).filter((item) => item.roleId === 'assassin' || item.roleId === 'userGhost');
      const objectionReason = objections.length > 0
        ? objections.map((item) => item.roleName + '指出：' + summarizeChallengeText(item.content, 54)).join('；')
        : '当前轮已经进入需要你明确回应的位置。';
      const requiredUserAction = session && session.requiredUserAction;

      if (session && session.currentPhase === 'waiting_user_problem_correction') {
        const inputLabel = requiredUserAction || '请确认或修正问题定义。';
        return {
          title: '修正问题定义',
          reason: architectSummary
            ? '架构师刚刚给出一版 framing：' + summarizeChallengeText(architectSummary.content, 72)
            : '系统已经提炼了一版问题定义，现在需要你确认它是否抓住了真正阻塞。',
          inputLabel,
          inputPlaceholder: '把真正的问题改写成一句话，并补充影响对象、范围和损失。',
          actions: [
            createChallengeFocusAction('rewrite_problem', '重写问题', '我把真正的问题定义改写为：', inputLabel, '直接重写问题定义，并说明这版为什么更准确。'),
            createChallengeFocusAction('add_fact', '补充事实', '为了校正问题定义，我补充这些事实：', inputLabel, '补充能支撑问题定义的真实场景、频率或损失。'),
            createChallengeFocusAction('narrow_scope', '收窄边界', '我先把问题范围收窄到：', inputLabel, '说明你要先聚焦哪类用户、哪一步和哪种损失。'),
          ],
        };
      }

      if (session && session.currentPhase === 'waiting_user_objection_response') {
        const inputLabel = requiredUserAction || '请直接回应当前轮中的关键质疑。';
        return {
          title: '回应本轮质疑',
          reason: objectionReason,
          inputLabel,
          inputPlaceholder: '请直接回应刺客和用户幽灵的关键质疑，说明你接受什么、反驳什么、还需验证什么。',
          actions: [
            createChallengeFocusAction('direct_counter', '直接反驳', '我直接回应这轮质疑：', inputLabel, '直接反驳最关键的一条质疑，并说明为什么它不成立。'),
            createChallengeFocusAction('partial_accept', '承认部分成立', '我接受其中一部分质疑，具体是：', inputLabel, '说明哪些质疑成立、哪些不成立，以及这会如何改变你的判断。'),
            createChallengeFocusAction('counter_example', '给一个反例', '我给出的反例如下：', inputLabel, '写一个能击穿当前质疑的真实场景、条件和原因。'),
          ],
        };
      }

      if (session && session.currentPhase === 'waiting_alternative_hypothesis_resolution') {
        const inputLabel = requiredUserAction || '请先处理更强的替代假设，再决定是否继续。';
        return {
          title: '处理替代假设',
          reason: '锚点官认为当前还有更强解释没有被正面处理，这一步必须先回答“为什么不是别的问题”。',
          inputLabel,
          inputPlaceholder: '请处理替代假设：承认并降级、补反证，或明确标记待验证。',
          actions: [
            createChallengeFocusAction('accept', '承认并降级', '我接受这个替代假设，并将原判断收窄为：', inputLabel, '如果你接受替代假设，写清它如何改变原来的问题定义和优先级。'),
            createChallengeFocusAction('counter', '补充反证', '我用以下反证说明，这个替代假设不足以取代当前判断：', inputLabel, '补一条能说明替代假设不足以解释问题的事实或案例。'),
            createChallengeFocusAction('verify', '标记待验证', '这个分歧需要继续验证，待核实的问题是：', inputLabel, '列出还没确认的前提、证据缺口和下一步验证动作。'),
          ],
        };
      }

      if (session && session.currentPhase === 'waiting_false_consensus_break') {
        const inputLabel = requiredUserAction || '请打破这段伪共识，明确哪些前提仍然不成立。';
        return {
          title: '拆开表面共识',
          reason: '系统判断你们只是表面达成一致，关键前提并没有真的站住。',
          inputLabel,
          inputPlaceholder: '指出哪些前提其实还没成立，哪些分歧还需要继续追问。',
          actions: [
            createChallengeFocusAction('broken_premise', '指出未成立前提', '这段共识里仍未成立的前提是：', inputLabel, '点名最关键的未成立前提，并说明为什么它会影响结论。'),
            createChallengeFocusAction('name_gap', '说明分歧点', '真正还没达成一致的分歧点是：', inputLabel, '说清楚哪一个判断标准、范围或约束仍未统一。'),
            createChallengeFocusAction('keep_pressing', '要求继续追问', '我认为这段共识还不能收束，下一步必须追问：', inputLabel, '写下必须继续追问的那一个问题。'),
          ],
        };
      }

      if (session && session.currentPhase === 'waiting_tech_escape_response') {
        const inputLabel = requiredUserAction || '请正面回应这些质疑，不要把讨论逃到“技术自然会解决”上。';
        return {
          title: '把讨论拉回真实问题',
          reason: '当前回应已经开始往“技术自然会解决”上逃，系统要求你回到业务目标、用户痛点和执行约束。',
          inputLabel,
          inputPlaceholder: '不要再谈抽象技术能力，直接回到业务目标、用户痛点和真实约束。',
          actions: [
            createChallengeFocusAction('business_goal', '回到业务目标', '先回到业务目标，我要解决的是：', inputLabel, '先讲目标和损失，不要先讲技术方案。'),
            createChallengeFocusAction('user_problem', '回到用户问题', '先回到用户问题，最真实的阻塞是：', inputLabel, '说明用户在哪一步最痛、为什么现有做法不够。'),
            createChallengeFocusAction('execution_constraint', '回到执行约束', '先回到执行约束，我必须考虑的是：', inputLabel, '说清成本、资源、协作复杂度或维护负担。'),
          ],
        };
      }

      if (session && session.currentPhase === 'waiting_round_decision') {
        if (completedRoundCount >= CLIENT_CHALLENGE_MAX_ROUNDS) {
          const inputLabel = requiredUserAction || CLIENT_CHALLENGE_MAX_ROUNDS_ERROR;
          return {
            title: '已达到质疑轮次上限',
            reason: '这一议题在 challenge 模式下最多只跑 ' + CLIENT_CHALLENGE_MAX_ROUNDS + ' 轮，避免无限追问；现在请改为切换模式或回看本轮结论。',
            inputLabel,
            inputPlaceholder: '如果要切到裁决模式，就写清接下来要做的判断；如果还不确定，就先回看本轮收束结论。',
            actions: [
              createChallengeFocusAction('switch_decision', '切到裁决模式', '我准备切到裁决模式，接下来要明确的决策是：', inputLabel, '写清要把哪一个问题带去裁决模式。'),
              createChallengeFocusAction('review_grounding', '回看本轮结论', '请先根据当前收束结论，帮我确认这轮已经站住和仍待验证的点：', inputLabel, '如果你还不确定是否该切模式，可以先让系统复述本轮结论。'),
            ],
          };
        }

        const inputLabel = requiredUserAction || '\u672c\u8f6e\u5df2\u5b8c\u6210\u3002\u4f60\u53ef\u4ee5\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u6216\u5207\u6362\u5230\u5176\u4ed6\u6a21\u5f0f\u3002';
        return {
          title: '决定这一轮怎么收束',
          reason: '\u951a\u70b9\u5b98\u5df2\u7ecf\u7ed9\u51fa\u672c\u8f6e\u6536\u675f\uff0c\u4f60\u73b0\u5728\u8981\u51b3\u5b9a\u662f\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u8fd8\u662f\u628a\u7ed3\u8bba\u5e26\u53bb\u4e0b\u4e00\u6a21\u5f0f\u3002',
          inputLabel,
          inputPlaceholder: '\u5982\u679c\u8981\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u5c31\u5199\u6e05\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u4ec0\u4e48\uff1b\u5982\u679c\u5207\u6a21\u5f0f\uff0c\u5c31\u5199\u6e05\u5e26\u7740\u4ec0\u4e48\u95ee\u9898\u5207\u6362\u3002',
          actions: [
            createChallengeFocusAction('continue_round', '\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee', '\u6211\u51b3\u5b9a\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u65b0\u7684\u63a8\u8fdb\u70b9\u662f\uff1a', inputLabel, '\u8bf4\u660e\u4e3a\u4ec0\u4e48\u8fd8\u8981\u7ee7\u7eed\u8ffd\u95ee\uff0c\u4ee5\u53ca\u4e0b\u4e00\u8f6e\u6700\u91cd\u8981\u7684\u95ee\u9898\u3002'),
            createChallengeFocusAction('switch_decision', '切到裁决模式', '我准备切到裁决模式，接下来要明确的决策是：', inputLabel, '写清要把哪一个问题带去裁决模式。'),
            createChallengeFocusAction('review_grounding', '回看本轮结论', '请先根据当前收束结论，帮我确认这轮已经站住和仍待验证的点：', inputLabel, '如果你还不确定是否该继续，可以先让系统复述本轮结论。'),
          ],
        };
      }

      if (session && session.currentPhase === 'topic_submitted') {
        if (hasExistingRounds) {
          const inputLabel = requiredUserAction || '\u8bf7\u8f93\u5165\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u7684\u8ffd\u95ee\u3001\u53cd\u4f8b\u6216\u4fee\u6b63\uff1b\u4ecd\u5728\u5f53\u524d\u4f1a\u8bdd\u91cc\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002';
          return {
            title: '\u53d1\u8d77\u4e0b\u4e00\u8f6e\u8ffd\u95ee',
            reason: '\u4e0a\u4e00\u8f6e\u5df2\u7ecf\u6536\u675f\uff1b\u8fd9\u91cc\u4ecd\u5728\u5f53\u524d\u4f1a\u8bdd\u91cc\uff0c\u53ea\u662f\u4e3a\u540c\u4e00\u8bae\u9898\u5f00\u542f\u4e0b\u4e00\u8f6e\u8ffd\u95ee\u3002',
            inputLabel,
            inputPlaceholder: '\u5199\u6e05\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u7684\u8ffd\u95ee\u3001\u53cd\u4f8b\u6216\u4fee\u6b63\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002',
            actions: [
              createChallengeFocusAction('next_counterexample', '\u8865\u4e00\u4e2a\u53cd\u4f8b', '\u4e0b\u4e00\u8f6e\u6211\u60f3\u5148\u9a8c\u8bc1\u8fd9\u4e2a\u53cd\u4f8b\uff1a', inputLabel, '\u5199\u6e05\u4f60\u60f3\u7528\u54ea\u4e2a\u771f\u5b9e\u573a\u666f\u6216\u53cd\u4f8b\u7ee7\u7eed\u65bd\u538b\u3002'),
              createChallengeFocusAction('narrow_dispute', '\u6536\u7a84\u4e89\u8bae\u70b9', '\u4e0b\u4e00\u8f6e\u6211\u60f3\u5148\u628a\u4e89\u8bae\u6536\u7a84\u5230\uff1a', inputLabel, '\u628a\u4e0b\u4e00\u8f6e\u53ea\u60f3\u7ee7\u7eed\u9a8c\u8bc1\u7684\u90a3\u4e00\u4e2a\u5206\u6b67\u70b9\u5199\u6e05\u3002'),
              createChallengeFocusAction('clarify_next_goal', '\u660e\u786e\u9a8c\u8bc1\u76ee\u6807', '\u4e0b\u4e00\u8f6e\u6211\u6700\u60f3\u5f04\u6e05\u7684\u662f\uff1a', inputLabel, '\u5199\u6e05\u4e0b\u4e00\u8f6e\u8ffd\u95ee\u8981\u5f62\u6210\u4ec0\u4e48\u6837\u7684\u5224\u65ad\u6216\u7ed3\u8bba\u3002'),
            ],
          };
        }

        const inputLabel = requiredUserAction || '请输入你的议题或想法。';
        return {
          title: '输入本轮议题',
          reason: '质疑模式还没有拿到一个可以开始 framing 的议题。',
          inputLabel,
          inputPlaceholder: '直接写你想讨论的议题，并补一两句背景或目标。',
          actions: [
            createChallengeFocusAction('add_background', '补背景', '我补充一下议题背景：', inputLabel, '写清背景、发生场景和当前损失。'),
            createChallengeFocusAction('narrow_scope', '收窄范围', '我先把议题范围收窄到：', inputLabel, '先限定人群、流程步骤或目标，避免议题太大。'),
            createChallengeFocusAction('clarify_goal', '明确目标', '这次讨论真正想明确的是：', inputLabel, '写清你要验证的判断、要做的取舍或要形成的结论。'),
          ],
        };
      }

      const inputLabel = requiredUserAction || '继续推进当前步骤。';
      return {
        title: '继续推进',
        reason: '系统已经进入下一步，但当前阶段还没有更具体的焦点模板。',
        inputLabel,
        inputPlaceholder: '继续补充当前步骤所需的信息，系统会按当前阶段继续推进。',
        actions: [
          createChallengeFocusAction('continue', '继续补充', '', inputLabel, '继续补充当前步骤需要的信息。'),
        ],
      };
    }

    function buildChallengeStep(currentPhase) {
      if (currentPhase === 'topic_submitted' || currentPhase === 'architect_framing') {
        return { current: 1, total: 6, label: '输入议题' };
      }
      if (currentPhase === 'waiting_user_problem_correction') {
        return { current: 2, total: 6, label: '确认问题定义' };
      }
      if (currentPhase === 'objection_generation') {
        return { current: 3, total: 6, label: '生成反方质疑' };
      }
      if (
        currentPhase === 'waiting_user_objection_response'
        || currentPhase === 'waiting_alternative_hypothesis_resolution'
        || currentPhase === 'waiting_false_consensus_break'
        || currentPhase === 'waiting_tech_escape_response'
      ) {
        return { current: 4, total: 6, label: '回应关键分歧' };
      }
      if (currentPhase === 'grounding') {
        return { current: 5, total: 6, label: '收束本轮结论' };
      }
      return { current: 6, total: 6, label: '决定本轮去向' };
    }

    function buildChallengeChecklist(session) {
      if (!session) {
        return [];
      }
      if (session.currentPhase === 'waiting_user_problem_correction') {
        return [
          { id: 'problem_definition', label: '用一句话重写真正的问题定义', detail: '不能只停留在“想做工具”这种方案层表述。', done: false },
          { id: 'scenario', label: '补清具体场景 / 团队 / 发生位置', detail: '至少说明谁在什么情境里被这个问题卡住。', done: false },
          { id: 'top_pains', label: '补足 3 条用户痛点', detail: '至少写出三条高频、可感知的痛点。', done: false },
          { id: 'constraints', label: '写出至少 1 条硬约束', detail: '例如时间、资源、协作成本或维护限制。', done: false },
        ];
      }
      if (session.currentPhase === 'waiting_user_objection_response') {
        return [
          { id: 'response_path', label: '先选择一种回应路径', detail: '直接反驳、部分承认或给出反例，不能空手提交。', done: false },
          { id: 'response_length', label: '回应至少 50 字', detail: '避免一句话跳过关键质疑。', done: false },
          { id: 'core_objection', label: '正面处理刺客和用户幽灵的核心质疑', detail: '至少说清哪些成立、哪些不成立、还需验证什么。', done: false },
        ];
      }
      if (session.currentPhase === 'waiting_alternative_hypothesis_resolution') {
        return [
          { id: 'response_path', label: '先选择替代假设处理路径', detail: '承认并降级、补反证，或标记待验证。', done: false },
          { id: 'minimum_structure', label: '写清为什么它不能直接取代当前判断', detail: '不能只说“我不同意”。', done: false },
        ];
      }
      if (session.currentPhase === 'waiting_false_consensus_break') {
        return [
          { id: 'response_path', label: '先选择伪共识拆解路径', detail: '指出未成立前提、命名分歧点，或要求继续追问。', done: false },
          { id: 'premise_gap', label: '明确哪一个前提仍然没站住', detail: '不能只写“还没达成一致”。', done: false },
        ];
      }
      if (session.currentPhase === 'waiting_tech_escape_response') {
        return [
          { id: 'response_path', label: '先选择回拉路径', detail: '回到业务目标、用户问题或执行约束。', done: false },
          { id: 'real_world_anchor', label: '把讨论拉回真实问题', detail: '不能继续停留在抽象技术能力。', done: false },
        ];
      }
      if (session.currentPhase === 'waiting_round_decision') {
        const handoff = session.latestChallengeHandoff;
        return [
          {
            id: 'problem_frame',
            label: '问题定义已经收束',
            detail: '这一轮至少要有一句被确认的问题定义。',
            done: Boolean(handoff && handoff.problemFrame && handoff.problemFrame.oneSentenceProblem),
          },
          {
            id: 'user_confirmed_context',
            label: '用户确认上下文已补齐',
            detail: '需要场景、3 条痛点和至少 1 条约束。',
            done: Boolean(
              handoff
              && handoff.userConfirmedContext
              && handoff.userConfirmedContext.scenario
              && Array.isArray(handoff.userConfirmedContext.topPains)
              && handoff.userConfirmedContext.topPains.length >= 3
              && Array.isArray(handoff.userConfirmedContext.constraints)
              && handoff.userConfirmedContext.constraints.length >= 1
            ),
          },
          {
            id: 'counter_hypothesis',
            label: '最强反设和采用阻力已压实',
            detail: '需要至少 1 条最强反设和 1 条采用阻力。',
            done: Boolean(
              handoff
              && handoff.strongestCounterHypothesis
              && Array.isArray(handoff.adoptionRisks)
              && handoff.adoptionRisks.length >= 1
            ),
          },
          {
            id: 'next_validation_actions',
            label: '下一步验证动作已明确',
            detail: '至少要有 1 条可执行的验证动作。',
            done: Boolean(handoff && Array.isArray(handoff.nextValidationActions) && handoff.nextValidationActions.length >= 1),
          },
        ];
      }
      return [
        { id: 'continue', label: '继续补齐当前步骤信息', detail: '如果系统还没给出更具体门槛，继续围绕当前阶段补充内容。', done: false },
      ];
    }

    function buildChallengeHandoffReadiness(session) {
      const handoff = session && session.latestChallengeHandoff;
      if (!handoff) {
        return {
          available: false,
          decisionReady: false,
          requirementBuildReady: false,
          summary: '本轮 handoff 还没形成，暂时不要切到下游模式。',
          openConflicts: [],
          nextValidationActions: [],
        };
      }
      const decisionReady = Boolean(handoff.roundStatus && handoff.roundStatus.matureEnoughForDecision);
      const requirementBuildReady = Boolean(handoff.roundStatus && handoff.roundStatus.matureEnoughForRequirementBuild);
      return {
        available: true,
        decisionReady,
        requirementBuildReady,
        summary: requirementBuildReady
          ? '这一轮已具备直接进入需求共建的成熟度。'
          : decisionReady
            ? '这一轮已足够进入裁决模式，但仍不适合直接写需求草稿。'
            : '这一轮还没形成完整 handoff，建议继续追问。',
        openConflicts: Array.isArray(handoff.openConflicts) ? handoff.openConflicts : [],
        nextValidationActions: Array.isArray(handoff.nextValidationActions) ? handoff.nextValidationActions : [],
      };
    }

    function buildChallengeModeSwitchState(session) {
      const readiness = buildChallengeHandoffReadiness(session);
      const baseBlockedReason = session && session.currentPhase === 'waiting_round_decision'
        ? ''
        : '请先完成这一轮的收束，再决定是否切模式。';
      const decisionReason = baseBlockedReason
        || (!readiness.available
          ? '本轮 handoff 还没生成完整，暂时不能进入裁决模式。'
          : !readiness.decisionReady
            ? '至少补齐问题定义、用户确认、最强反设和下一步验证动作后，才能进入裁决模式。'
            : '可以把这一轮带去裁决模式继续做取舍。');
      const requirementReason = baseBlockedReason
        || (!readiness.available
          ? '本轮 handoff 还没生成完整，暂时不能进入需求共建模式。'
          : !readiness.decisionReady
            ? '这一轮连裁决成熟度都还没到，先不要直接写需求草稿。'
            : !readiness.requirementBuildReady
              ? (
                readiness.openConflicts.length > 0
                  ? '仍有未决冲突：' + readiness.openConflicts.join('；')
                  : '还缺 MVP 边界或排除项，暂时不要直接进入需求共建模式。'
              )
              : '这一轮已经可以直接承接到需求共建模式。');
      return {
        decision: {
          enabled: Boolean(session && session.currentPhase === 'waiting_round_decision' && readiness.decisionReady),
          reason: decisionReason,
        },
        'requirement-build': {
          enabled: Boolean(session && session.currentPhase === 'waiting_round_decision' && readiness.requirementBuildReady),
          reason: requirementReason,
        },
      };
    }

    function renderChallengeChecklist(model) {
      if (!model) {
        return '<div class="empty">加载完成后，这里会显示这一轮必须补齐的输入门槛和切模条件。</div>';
      }

      const checklist = Array.isArray(model.checklist) ? model.checklist : [];
      const itemsHtml = checklist.length === 0
        ? '<div class="empty">当前阶段还没有额外的 checklist 约束。</div>'
        : '<div class="challenge-checklist-list">' + checklist.map((item) => (
          '<div class="challenge-checklist-item ' + (item.done ? 'done' : 'pending') + '">' +
            '<div><span class="challenge-checklist-status">' + (item.done ? '已满足' : '待补齐') + '</span><strong>' + escapeHtml(item.label) + '</strong></div>' +
            (item.detail ? '<div class="challenge-checklist-detail">' + escapeHtml(item.detail) + '</div>' : '') +
          '</div>'
        )).join('') + '</div>';

      const gates = model.modeSwitchState || buildChallengeModeSwitchState(null);
      const readiness = model.handoffReadiness || buildChallengeHandoffReadiness(null);
      const gateHtml = '<div class="challenge-mode-gate-list">' + [
        { mode: 'decision', label: '裁决模式', state: gates.decision },
        { mode: 'requirement-build', label: '需求共建模式', state: gates['requirement-build'] },
      ].map((entry) => (
        '<div class="challenge-mode-gate-item ' + (entry.state && entry.state.enabled ? 'enabled' : 'blocked') + '">' +
          '<strong>' + entry.label + '</strong>' +
          '<div class="challenge-checklist-detail">' + escapeHtml(entry.state && entry.state.reason ? entry.state.reason : '当前没有额外说明。') + '</div>' +
        '</div>'
      )).join('') + '</div>';

      const handoffSummary = '<div class="challenge-handoff-summary">' +
        '<strong>handoff 状态</strong>' +
        '<div class="challenge-checklist-detail">' + escapeHtml(readiness.summary || '本轮 handoff 还没形成。') + '</div>' +
        (readiness.openConflicts && readiness.openConflicts.length > 0
          ? '<div class="challenge-checklist-detail">未决冲突：' + escapeHtml(readiness.openConflicts.join('；')) + '</div>'
          : '') +
        (readiness.nextValidationActions && readiness.nextValidationActions.length > 0
          ? '<div class="challenge-checklist-detail">下一步验证动作：' + escapeHtml(readiness.nextValidationActions.join('；')) + '</div>'
          : '') +
      '</div>';

      return '<strong>本步过关条件</strong>' + itemsHtml + handoffSummary + gateHtml;
    }

    function buildClientChallengeWorkbenchModel(session, modeState) {
      const messages = modeState && Array.isArray(modeState.messages) ? modeState.messages : [];
      const rounds = buildChallengeRounds(messages);
      const hasExistingRounds = rounds.some((round) => Array.isArray(round) && round.length > 0);
      const completedRoundCount = countCompletedChallengeRounds(rounds);
      const step = buildChallengeStep(session && session.currentPhase);
      const useClosedRound = [
        'waiting_round_decision',
        'waiting_alternative_hypothesis_resolution',
        'waiting_false_consensus_break',
        'waiting_tech_escape_response',
      ].includes(session && session.currentPhase);

      let currentRoundIndex = rounds.length - 1;
      if (useClosedRound) {
        currentRoundIndex = -1;
        for (let index = rounds.length - 1; index >= 0; index -= 1) {
          if (rounds[index] && rounds[index].some((item) => item.roleId === 'grounder')) {
            currentRoundIndex = index;
            break;
          }
        }
        if (currentRoundIndex === -1) {
          currentRoundIndex = rounds.length - 1;
        }
      }

      const currentItems = currentRoundIndex >= 0 ? (rounds[currentRoundIndex] || []) : [];
      const historyGroups = rounds
        .filter((_round, index) => index !== currentRoundIndex)
        .map((round, index) => ({
          label: '第 ' + (index + 1) + ' 轮',
          summary: summarizeChallengeRound(round),
          items: round,
        }));
      const latestArchitectMessage = currentItems.find((item) => item.roleId === 'architect')
        || (() => {
          const message = latestChallengeMessageBySpeaker(messages, 'role', 'architect');
          return message ? {
            roleId: message.roleId,
            roleName: message.roleName || challengeRoleLabels[message.roleId] || message.roleId,
            content: message.content || '',
            timestamp: message.timestamp || '',
          } : null;
        })();
      const latestUserMessage = latestChallengeMessageBySpeaker(messages, 'user');
      const keyConflicts = currentItems
        .filter((item) => item.roleId === 'assassin' || item.roleId === 'userGhost' || item.roleId === 'grounder')
        .map((item) => item.roleName + '：' + summarizeChallengeText(item.content, 88))
        .slice(0, 3);
      const focusCard = buildClientChallengeFocusCard(session, currentItems, hasExistingRounds, completedRoundCount);
      const checklist = buildChallengeChecklist(session);
      const handoffReadiness = buildChallengeHandoffReadiness(session);
      const modeSwitchState = buildChallengeModeSwitchState(session);
      const currentRound = {
        title: '当前轮上下文',
        summary: summarizeChallengeRound(currentItems),
        items: currentItems,
      };

      return {
        layoutMode: session && session.currentPhase === 'topic_submitted' && !hasExistingRounds ? 'topic-intake' : 'standard',
        step,
        currentRound,
        currentContext: currentRound,
        historyGroups,
        focusCard,
        checklist,
        handoffReadiness,
        modeSwitchState,
        topicBrief: {
          topic: session && session.topic ? session.topic : '当前议题尚未命名',
          currentFraming: latestArchitectMessage ? summarizeChallengeText(latestArchitectMessage.content, 140) : '架构师问题定义还没生成。',
          latestUserPosition: latestUserMessage ? summarizeChallengeText(latestUserMessage.content, 140) : '你还没有在当前会话中补充最新立场。',
          confirmedFacts: session && session.sharedContext && Array.isArray(session.sharedContext.confirmedFacts) ? session.sharedContext.confirmedFacts : [],
          hardConstraints: session && session.sharedContext && Array.isArray(session.sharedContext.hardConstraints) ? session.sharedContext.hardConstraints : [],
          sourceReferences: session && session.sharedContext && Array.isArray(session.sharedContext.sourceReferences) ? session.sharedContext.sourceReferences : [],
          keyConflicts,
        },
        quickActions: focusCard.actions,
      };
    }

    function renderChallengeContextItems(items, emptyText) {
      if (!items || items.length === 0) {
        return '<div class="empty">' + escapeHtml(emptyText || '当前轮还没有可直接回应的上下文。') + '</div>';
      }

      return items.map((item) => (
        '<article class="challenge-context-item">' +
          '<strong>' + escapeHtml(item.roleName || item.roleId || '系统') + '</strong>' +
          '<div class="md-content">' + (typeof renderMarkdown === 'function' ? renderMarkdown(item.content || '') : escapeHtml(item.content || '').replaceAll('\\n', '<br>')) + '</div>' +
          (item.timestamp ? '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(item.timestamp)) + '</div>' : '') +
        '</article>'
      )).join('');
    }

    function renderChallengeHistoryNav(historyGroups) {
      if (!historyGroups || historyGroups.length === 0) {
        return '<div class="empty">完成第一轮后，这里会出现轮次导航。</div>';
      }

      return historyGroups.map((group, index) => (
        '<button type="button" class="challenge-history-button" data-history-index="' + escapeHtml(index) + '">' +
          escapeHtml(group.label) +
          '<span class="microcopy">' + escapeHtml(summarizeChallengeText(group.summary, 72) || '点击查看这轮摘要') + '</span>' +
        '</button>'
      )).join('');
    }

    function renderChallengeHistoryPreview(group) {
      if (!group) {
        return '<div class="empty">点任意已完成轮次后，这里只显示摘要，不会切走当前输入。</div>';
      }

      return (
        '<div class="challenge-history-preview-body">' +
          '<div class="callout"><strong>' + escapeHtml(group.label) + '</strong><p class="small" style="margin:8px 0 0;">' + escapeHtml(group.summary).replaceAll('\\n', '<br>') + '</p></div>' +
          renderChallengeContextItems(group.items, '') +
        '</div>'
      );
    }

    function renderChallengeFocusActions(actions) {
      if (!actions || actions.length === 0) {
        return '';
      }

      return actions.map((action) => (
        '<button'
        + ' type="button"'
        + ' data-focus-action="' + escapeHtml(action.kind) + '"'
        + ' data-focus-action-template="' + escapeHtml(action.template || '') + '"'
        + ' data-focus-input-label="' + escapeHtml(action.inputLabel || '') + '"'
        + ' data-focus-placeholder="' + escapeHtml(action.placeholder || '') + '"'
        + '>'
        + escapeHtml(action.label)
        + '</button>'
      )).join('');
    }

    function renderChallengeBriefSections(sections, emptyText) {
      if (!sections || sections.length === 0) {
        return '<div class="empty">' + escapeHtml(emptyText) + '</div>';
      }

      return '<div class="challenge-brief-list">' + sections.map((section) => (
        '<div class="challenge-brief-section">' +
          '<strong>' + escapeHtml(section.label) + '</strong>' +
          '<div>' + escapeHtml(section.value || '').replaceAll('\\n', '<br>') + '</div>' +
        '</div>'
      )).join('') + '</div>';
    }

    function renderChallengeBulletList(items, emptyText) {
      if (!items || items.length === 0) {
        return '<div class="empty">' + escapeHtml(emptyText) + '</div>';
      }

      return '<div class="challenge-bullet-list">' + items.map((item) => (
        '<div class="challenge-bullet-item">' + escapeHtml(item) + '</div>'
      )).join('') + '</div>';
    }

    function renderChallengeStatusStrip(session, taskModel, model) {
      const parts = [
        model && model.step
          ? '<span class="challenge-status-pill">步骤：第 ' + escapeHtml(model.step.current) + ' / ' + escapeHtml(model.step.total) + ' 步 · ' + escapeHtml(model.step.label) + '</span>'
          : '',
        '<span class="challenge-status-pill">阶段：' + escapeHtml(formatSessionPhaseLabel(session.currentPhase) || session.currentPhase || '') + '</span>',
        '<span class="challenge-status-pill">交互：' + escapeHtml(interactionStateLabel(session.interactionState)) + '</span>',
      ].filter(Boolean);

      if (taskModel && taskModel.headline) {
        parts.push('<span class="challenge-status-pill">下一步：' + escapeHtml(taskModel.headline) + '</span>');
      }
      if (session.lastCompletedStep) {
        parts.push('<span class="challenge-status-pill">已完成：' + escapeHtml(formatSessionLastStepLabel(session.lastCompletedStep) || session.lastCompletedStep) + '</span>');
      }

      return parts.join('');
    }

    function setChallengeContextExpanded(expanded) {
      challengeContextExpanded = Boolean(expanded);
      const currentContext = document.getElementById('challengeCurrentContext');
      const toggle = document.getElementById('challengeRoundSummaryToggle');
      if (currentContext) {
        currentContext.hidden = !challengeContextExpanded;
      }
      if (toggle) {
        toggle.textContent = challengeContextExpanded ? '收起完整上下文' : '展开完整上下文';
      }
    }

    function syncChallengeFocusSelection(selectedAction) {
      const focusActionInput = document.getElementById('sessionMessageFocusAction');
      if (focusActionInput) {
        focusActionInput.value = selectedAction || '';
      }
      for (const button of document.querySelectorAll('#challengeFocusActions [data-focus-action]')) {
        button.classList.toggle('active', Boolean(selectedAction) && button.dataset.focusAction === selectedAction);
      }
    }

    function problemCorrectionListConfig(fieldName) {
      if (fieldName === 'topPains') {
        return {
          minItems: 3,
          placeholder: '写一条高频、可感知、能说明损失的痛点。',
          addLabel: '新增一条痛点',
        };
      }
      return {
        minItems: 1,
        placeholder: '写一条不能回避的时间、资源、组织或维护限制。',
        addLabel: '新增一条约束',
      };
    }

    function renderProblemCorrectionListRowHtml(fieldName, placeholder, value) {
      return ''
        + '<div class="inline-form">'
        + '<input name="' + escapeHtml(fieldName) + '" type="text" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(value || '') + '" />'
        + '<button type="button" class="secondary" data-remove-list="' + escapeHtml(fieldName) + '">删除</button>'
        + '</div>';
    }

    function getProblemCorrectionListRoot(fieldName) {
      if (fieldName === 'topPains') {
        return document.getElementById('challengeProblemTopPainsList');
      }
      if (fieldName === 'constraints') {
        return document.getElementById('challengeProblemConstraintsList');
      }
      return null;
    }

    function syncProblemCorrectionListControls(fieldName) {
      const root = getProblemCorrectionListRoot(fieldName);
      const config = problemCorrectionListConfig(fieldName);
      if (!root) {
        return;
      }
      const rows = Array.from(root.querySelectorAll('[data-remove-list="' + fieldName + '"]'));
      const canRemove = rows.length > config.minItems;
      for (const button of rows) {
        button.disabled = !canRemove;
        button.style.visibility = canRemove ? '' : 'hidden';
      }
    }

    function addProblemCorrectionListItem(fieldName, value) {
      const root = getProblemCorrectionListRoot(fieldName);
      if (!root) {
        return;
      }
      const config = problemCorrectionListConfig(fieldName);
      root.insertAdjacentHTML('beforeend', renderProblemCorrectionListRowHtml(fieldName, config.placeholder, value || ''));
      syncProblemCorrectionListControls(fieldName);
    }

    function readProblemCorrectionList(fieldName) {
      const root = getProblemCorrectionListRoot(fieldName);
      if (!root) {
        return [];
      }
      return Array.from(root.querySelectorAll('input[name="' + fieldName + '"]'))
        .map((input) => String(input.value || '').trim())
        .filter(Boolean);
    }

    function readProblemCorrectionDraftFromForm() {
      const problemDefinitionInput = document.getElementById('challengeProblemDefinitionInput');
      const scenarioInput = document.getElementById('challengeScenarioInput');
      const notesInput = document.getElementById('challengeProblemNotesInput');
      return {
        problemDefinition: String(problemDefinitionInput && problemDefinitionInput.value || '').trim(),
        scenario: String(scenarioInput && scenarioInput.value || '').trim(),
        topPains: readProblemCorrectionList('topPains'),
        constraints: readProblemCorrectionList('constraints'),
        notes: String(notesInput && notesInput.value || '').trim(),
      };
    }

    function serializeChallengeProblemCorrectionForm(draft) {
      const lines = [
        '问题定义：' + String(draft.problemDefinition || '').trim(),
        '场景：' + String(draft.scenario || '').trim(),
        '核心痛点：',
        ...((draft.topPains || []).map((item) => String(item || '').trim()).filter(Boolean).map((item) => '- ' + item)),
        '约束：',
        ...((draft.constraints || []).map((item) => String(item || '').trim()).filter(Boolean).map((item) => '- ' + item)),
      ];

      const notes = String(draft.notes || '').trim();
      if (notes) {
        lines.push('补充说明：', notes);
      }
      return lines.join('\n');
    }

    function buildProblemCorrectionChecklistFromDraft(draft) {
      return [
        {
          id: 'problem_definition',
          label: '问题定义',
          detail: '用一句话写清真正被卡住的是什么，而不是你想做什么方案。',
          done: String(draft.problemDefinition || '').trim().length >= 12,
        },
        {
          id: 'scenario',
          label: '场景/行业',
          detail: '写清谁在什么情境里被这个问题卡住。',
          done: String(draft.scenario || '').trim().length >= 6,
        },
        {
          id: 'top_pains',
          label: '至少 3 条核心痛点',
          detail: '每条都应该是高频、可感知、能说明损失的痛点。',
          done: Array.isArray(draft.topPains) && draft.topPains.length >= 3,
        },
        {
          id: 'constraints',
          label: '至少 1 条约束',
          detail: '写出时间、资源、组织或维护上的硬限制。',
          done: Array.isArray(draft.constraints) && draft.constraints.length >= 1,
        },
      ];
    }

    function renderProblemCorrectionChecklistFromDraft(draft, model) {
      const checklist = buildProblemCorrectionChecklistFromDraft(draft);
      const itemsHtml = '<div class="challenge-checklist-list">' + checklist.map((item) => (
        '<div class="challenge-checklist-item ' + (item.done ? 'done' : 'pending') + '">' +
          '<div><span class="challenge-checklist-status">' + (item.done ? '已满足' : '待补齐') + '</span><strong>' + escapeHtml(item.label) + '</strong></div>' +
          '<div class="challenge-checklist-detail">' + escapeHtml(item.detail) + '</div>' +
        '</div>'
      )).join('') + '</div>';

      const gates = model && model.modeSwitchState ? model.modeSwitchState : buildChallengeModeSwitchState(null);
      const readiness = model && model.handoffReadiness ? model.handoffReadiness : buildChallengeHandoffReadiness(null);
      const gateHtml = '<div class="challenge-mode-gate-list">' + [
        { label: '裁决模式', state: gates.decision },
        { label: '需求共建模式', state: gates['requirement-build'] },
      ].map((entry) => (
        '<div class="challenge-mode-gate-item ' + (entry.state && entry.state.enabled ? 'enabled' : 'blocked') + '">' +
          '<strong>' + entry.label + '</strong>' +
          '<div class="challenge-checklist-detail">' + escapeHtml(entry.state && entry.state.reason ? entry.state.reason : '当前没有额外说明。') + '</div>' +
        '</div>'
      )).join('') + '</div>';

      return '<strong>本步过关条件</strong>' + itemsHtml
        + '<div class="challenge-handoff-summary"><strong>handoff 状态</strong><div class="challenge-checklist-detail">'
        + escapeHtml(readiness.summary || '本轮 handoff 还没形成。')
        + '</div></div>'
        + gateHtml;
    }

    function syncChallengeProblemCorrectionForm(session, model) {
      const formShell = document.getElementById('challengeProblemCorrectionForm');
      const inputWrap = document.getElementById('sessionMessageInputWrap');
      const composerInput = document.getElementById('sessionMessageInput');
      const checklistPanel = document.getElementById('challengeChecklistPanel');
      const enabled = Boolean(
        session
        && session.currentMode === 'challenge'
        && session.currentPhase === 'waiting_user_problem_correction'
      );

      if (formShell) {
        formShell.style.display = enabled ? '' : 'none';
      }
      if (inputWrap && enabled) {
        inputWrap.style.display = 'none';
      }
      if (composerInput) {
        composerInput.required = !enabled;
        composerInput.disabled = enabled;
      }

      syncProblemCorrectionListControls('topPains');
      syncProblemCorrectionListControls('constraints');

      if (enabled && checklistPanel) {
        checklistPanel.innerHTML = renderProblemCorrectionChecklistFromDraft(readProblemCorrectionDraftFromForm(), model);
      }
    }

    function applyProblemCorrectionSuggestion(suggestion) {
      const problemDefinitionInput = document.getElementById('challengeProblemDefinitionInput');
      const scenarioInput = document.getElementById('challengeScenarioInput');
      const notesInput = document.getElementById('challengeProblemNotesInput');
      const topPainsRoot = getProblemCorrectionListRoot('topPains');
      const constraintsRoot = getProblemCorrectionListRoot('constraints');
      if (problemDefinitionInput && suggestion.problemDefinition) {
        problemDefinitionInput.value = suggestion.problemDefinition;
      }
      if (scenarioInput && suggestion.scenario) {
        scenarioInput.value = suggestion.scenario;
      }
      if (notesInput && suggestion.notes) {
        notesInput.value = suggestion.notes;
      }
      if (topPainsRoot) {
        const values = Array.isArray(suggestion.topPains) && suggestion.topPains.length > 0
          ? suggestion.topPains
          : ['', '', ''];
        topPainsRoot.innerHTML = values.map((value) => renderProblemCorrectionListRowHtml(
          'topPains',
          problemCorrectionListConfig('topPains').placeholder,
          value,
        )).join('');
      }
      if (constraintsRoot) {
        const values = Array.isArray(suggestion.constraints) && suggestion.constraints.length > 0
          ? suggestion.constraints
          : [''];
        constraintsRoot.innerHTML = values.map((value) => renderProblemCorrectionListRowHtml(
          'constraints',
          problemCorrectionListConfig('constraints').placeholder,
          value,
        )).join('');
      }
      syncProblemCorrectionListControls('topPains');
      syncProblemCorrectionListControls('constraints');
    }

    function validateChallengeComposerInput(session, action, content, focusAction) {
      if (!session || session.currentMode !== 'challenge') {
        return '';
      }

      const trimmed = String(content || '').trim();
      if (action === 'objection_response' && trimmed.length < CLIENT_CHALLENGE_MIN_RESPONSE_LENGTH) {
        return CLIENT_CHALLENGE_MIN_RESPONSE_ERROR;
      }

      if (
        action === 'objection_response'
        && session.currentPhase === 'waiting_user_objection_response'
        && !String(focusAction || '').trim()
      ) {
        return '当前阶段必须先选择一种回应路径，再提交回应。';
      }

      if (CLIENT_CHALLENGE_INTERRUPT_PHASES.has(session.currentPhase || '') && !String(focusAction || '').trim()) {
        return '当前中断态必须先选择一种处理路径，再提交回应。';
      }

      if (action === 'round_resolution') {
        const messages = latestSessionData && latestSessionData.modeState && Array.isArray(latestSessionData.modeState.messages)
          ? latestSessionData.modeState.messages
          : [];
        const completedRoundCount = countCompletedChallengeRounds(buildChallengeRounds(messages));
        if (completedRoundCount >= CLIENT_CHALLENGE_MAX_ROUNDS) {
          return CLIENT_CHALLENGE_MAX_ROUNDS_ERROR;
        }
      }

      return '';
    }

    function resolveClientChallengeAction(session, rawAction) {
      if (!session || session.currentMode !== 'challenge') {
        return rawAction || '';
      }
      if (rawAction === 'raw_topic' || rawAction === 'problem_correction' || rawAction === 'objection_response' || rawAction === 'round_resolution') {
        return rawAction;
      }
      if (session.currentPhase === 'waiting_user_problem_correction') {
        return 'problem_correction';
      }
      if (
        session.currentPhase === 'waiting_user_objection_response'
        || CLIENT_CHALLENGE_INTERRUPT_PHASES.has(session.currentPhase || '')
      ) {
        return 'objection_response';
      }
      if (session.currentPhase === 'waiting_round_decision') {
        return 'round_resolution';
      }
      return 'raw_topic';
    }

    function syncChallengeWorkbench(data, taskModel) {
      const shell = document.getElementById('challengeWorkbenchShell');
      const statusStrip = document.getElementById('challengeStatusStrip');
      const currentRoundHeadline = document.getElementById('challengeCurrentRoundHeadline');
      const currentRoundHint = document.getElementById('challengeCurrentRoundHint');
      const currentRoundSummary = document.getElementById('challengeCurrentRoundSummary');
      const currentContext = document.getElementById('challengeCurrentContext');
      const historyNav = document.getElementById('challengeHistoryNav');
      const historyPreview = document.getElementById('challengeHistoryPreview');
      const focusTitle = document.getElementById('challengeFocusTitle');
      const focusReason = document.getElementById('challengeFocusReason');
      const focusActions = document.getElementById('challengeFocusActions');
      const checklistPanel = document.getElementById('challengeChecklistPanel');
      const inlineTopic = document.getElementById('challengeInlineTopic');
      const topicHeader = document.getElementById('sessionTopicHeader');
      const topicAnchorPanel = document.getElementById('challengeTopicAnchorPanel');
      const framingPanel = document.getElementById('challengeFramingPanel');
      const conflictPanel = document.getElementById('challengeConflictPanel');
      const framingHeading = document.getElementById('challengeFramingHeading');
      const conflictHeading = document.getElementById('challengeConflictHeading');
      const modeSwitcherBlock = document.getElementById('challengeModeSwitcherBlock');
      const modeSwitcherHint = document.getElementById('challengeModeSwitcherHint');
      const composerLabel = document.getElementById('sessionComposerLabel');
      const composerInput = document.getElementById('sessionMessageInput');
      const isChallenge = Boolean(data && data.session && data.session.currentMode === 'challenge');
      const model = isChallenge ? buildClientChallengeWorkbenchModel(data.session, data.modeState) : null;
      const isTopicIntake = Boolean(model && model.layoutMode === 'topic-intake');

      document.body.classList.toggle('challenge-mode', isChallenge);
      document.body.classList.toggle('challenge-topic-intake', isTopicIntake);
      if (shell) {
        shell.style.display = isChallenge ? '' : 'none';
      }

      if (!isChallenge) {
        latestChallengeModel = null;
        if (statusStrip) {
          statusStrip.innerHTML = '当前轮状态会在这里展开，避免你先读一大块摘要再去找操作入口。';
        }
        if (currentRoundSummary) {
          currentRoundSummary.innerHTML = '加载完成后，这里会收束出当前轮的核心上下文。';
        }
        if (currentContext) {
          currentContext.innerHTML = '<div class="empty">当前轮上下文会贴在输入区旁边，避免你反复回到上方查找。</div>';
        }
        if (historyNav) {
          historyNav.innerHTML = '<div class="empty">完成第一轮后，这里会出现轮次导航。</div>';
        }
        if (historyPreview) {
          historyPreview.innerHTML = '<div class="empty">点任意已完成轮次后，这里只显示摘要，不会切走当前输入。</div>';
        }
        if (focusActions) {
          focusActions.innerHTML = '';
        }
        if (checklistPanel) {
          checklistPanel.innerHTML = '<strong>本步过关条件</strong><div class="empty" style="margin-top:10px;">加载完成后，这里会显示这一轮必须补齐的输入门槛和切模条件。</div>';
        }
        if (focusTitle) {
          focusTitle.textContent = taskModel.headline || '继续推进';
        }
        if (focusReason) {
          focusReason.textContent = '当前模式会在这里给出最关键的下一步提示。';
        }
        if (topicHeader) {
          topicHeader.textContent = '当前议题：' + (data && data.session && data.session.topic ? data.session.topic : '正在读取当前议题…');
        }
        if (topicAnchorPanel) {
          topicAnchorPanel.innerHTML = '<div class="challenge-brief-section"><strong>当前议题</strong><div>' + escapeHtml(data && data.session && data.session.topic ? data.session.topic : '当前议题尚未命名') + '</div></div>';
        }
        if (framingHeading) {
          framingHeading.textContent = '当前模式摘要';
        }
        if (framingPanel) {
          framingPanel.innerHTML = '<div class="challenge-brief-section"><strong>当前步骤</strong><div>' + escapeHtml(taskModel.headline || '继续推进当前步骤。') + '</div></div>';
        }
        if (conflictHeading) {
          conflictHeading.textContent = '当前模式提示';
        }
        if (conflictPanel) {
          conflictPanel.innerHTML = '<div class="challenge-brief-section"><strong>模式状态</strong><div>切换到质疑模式时，这里会显示当前关键分歧。</div></div>';
        }
        if (modeSwitcherBlock) {
          modeSwitcherBlock.style.display = '';
        }
        if (modeSwitcherHint) {
          modeSwitcherHint.textContent = taskModel.showModeSwitcher ? '模式切换后会持续生效，直到你再次切换。' : '先处理完当前关键动作，再考虑切换模式。';
        }
        syncChallengeFocusSelection('');
        setChallengeContextExpanded(false);
        syncChallengeProblemCorrectionForm(null, null);
        return;
      }

      latestChallengeModel = model;
      if (statusStrip) {
        statusStrip.className = 'challenge-status-strip';
        statusStrip.innerHTML = renderChallengeStatusStrip(data.session, taskModel, model);
      }
      if (focusTitle) {
        focusTitle.textContent = model.focusCard.title;
      }
      if (focusReason) {
        focusReason.textContent = model.focusCard.reason;
      }
      if (composerLabel) {
        composerLabel.textContent = model.focusCard.inputLabel;
      }
      if (composerInput) {
        composerInput.placeholder = model.focusCard.inputPlaceholder;
      }
      if (focusActions) {
        focusActions.innerHTML = renderChallengeFocusActions(model.focusCard.actions);
      }
      if (checklistPanel) {
        checklistPanel.innerHTML = renderChallengeChecklist(model);
      }
      syncChallengeProblemCorrectionForm(data.session, model);
      syncChallengeFocusSelection('');
      if (inlineTopic) {
        inlineTopic.innerHTML = '<strong>当前议题</strong><span class="challenge-topic-headline">' + escapeHtml(model.topicBrief.topic) + '</span>';
      }
      if (topicHeader) {
        topicHeader.textContent = '当前议题：' + model.topicBrief.topic;
      }
      if (currentRoundHeadline) {
        currentRoundHeadline.textContent = model.currentRound.title;
      }
      if (currentRoundHint) {
        currentRoundHint.textContent = '默认只看摘要；如果你需要完整上下文，再展开。当前是第 ' + model.step.current + ' / ' + model.step.total + ' 步。';
      }
      if (currentRoundSummary) {
        currentRoundSummary.innerHTML = model.currentRound.summary
          ? '<strong>当前轮摘要</strong><p class="small" style="margin:8px 0 0;">' + escapeHtml(model.currentRound.summary).replaceAll('\\n', '<br>') + '</p>'
          : '<div class="empty">当前轮还没有足够的角色输出可供回应。</div>';
      }
      if (currentContext) {
        currentContext.innerHTML = renderChallengeContextItems(model.currentRound.items, '当前轮还没有可直接回应的上下文。');
      }
      if (historyNav) {
        historyNav.innerHTML = renderChallengeHistoryNav(model.historyGroups);
      }
      if (historyPreview) {
        historyPreview.innerHTML = renderChallengeHistoryPreview(model.historyGroups[0] || null);
      }
      if (topicAnchorPanel) {
        topicAnchorPanel.innerHTML = renderChallengeBriefSections(
          isTopicIntake
            ? [
              { label: '主议题', value: model.topicBrief.topic },
            ]
            : [
              { label: '主议题', value: model.topicBrief.topic },
              { label: '当前模式', value: modeLabel(data.session.currentMode) },
              { label: '当前阶段', value: formatSessionPhaseLabel(data.session.currentPhase) || data.session.currentPhase || '' },
            ],
          '当前议题尚未命名。',
        );
      }
      if (framingHeading) {
        framingHeading.textContent = '当前问题定义';
      }
      if (framingPanel) {
        framingPanel.innerHTML = renderChallengeBriefSections([
          { label: '架构师最新 framing', value: model.topicBrief.currentFraming },
          { label: '你的最近立场', value: model.topicBrief.latestUserPosition },
        ], '架构师问题定义和你的最新立场会显示在这里。');
      }
      if (conflictHeading) {
        conflictHeading.textContent = '当前关键分歧';
      }
      if (conflictPanel) {
        conflictPanel.innerHTML = renderChallengeBulletList(model.topicBrief.keyConflicts, '刺客、用户幽灵和锚点官指出的关键分歧会显示在这里。');
      }
      if (modeSwitcherBlock) {
        modeSwitcherBlock.style.display = taskModel.showModeSwitcher ? '' : 'none';
      }
      if (modeSwitcherHint) {
        modeSwitcherHint.textContent = taskModel.showModeSwitcher
          ? (
            model.modeSwitchState && model.modeSwitchState['requirement-build'] && model.modeSwitchState['requirement-build'].enabled
              ? '本轮 handoff 已足够承接到下游模式。'
              : (model.modeSwitchState && model.modeSwitchState.decision ? model.modeSwitchState.decision.reason : '如果要切模式，先看清当前轮已经站住什么。')
          )
          : '当前流程还没收束，先处理完这一轮的关键动作。';
      }
      setChallengeContextExpanded(false);
    }

    function renderTaskSummary(taskModel) {
      const summaryParts = [];
      summaryParts.push('<strong>现在只需要做一件事</strong>');
      summaryParts.push('<p class="small" style="margin:4px 0 0;">' + escapeHtml(taskModel.headline) + '</p>');

      if (taskModel.primaryInputAction) {
        summaryParts.push('<p class="small" style="margin:8px 0 0;">当前阶段接受自由输入，提交时会自动绑定正确动作。</p>');
      } else if (taskModel.explicitChoices.length > 0) {
        summaryParts.push('<p class="small" style="margin:8px 0 0;">当前阶段更适合直接点选明确动作，而不是继续自由输入。</p>');
      } else {
        summaryParts.push('<p class="small" style="margin:8px 0 0;">如果当前步骤没有明确按钮，直接补充上下文即可。</p>');
      }

      if (!taskModel.showModeSwitcher) {
        summaryParts.push('<p class="small" style="margin:8px 0 0;">建议先处理完这一步，再考虑切换模式。</p>');
      }

      return summaryParts.join('');
    }

    function setActionControlsDisabled(disabled) {
      document.getElementById('sessionSendButton').disabled = disabled;
      for (const button of document.querySelectorAll('#sessionPrimaryActionButtons [data-explicit-action]')) {
        button.disabled = disabled;
      }
    }

    function syncPrimaryActionPanel(data, disabled) {
      const taskModel = buildClientSessionTaskModel(data.session, data.artifacts || {}, data.modeState || null);
      const headlineEl = document.getElementById('sessionPrimaryActionHeadline');
      const hintEl = document.getElementById('sessionPrimaryActionHint');
      const actionInput = document.getElementById('sessionMessageAction');
      const composerLabel = document.getElementById('sessionComposerLabel');
      const inputWrap = document.getElementById('sessionMessageInputWrap');
      const input = document.getElementById('sessionMessageInput');
      const sendButton = document.getElementById('sessionSendButton');
      const choicePanel = document.getElementById('sessionPrimaryActionButtons');
      const finalizeForm = document.getElementById('finalizeArtifactsForm');
      const taskSummary = document.getElementById('sessionTaskSummary');
      const modeSwitcher = document.getElementById('sessionModeSwitcher');
      const modeSwitcherHint = document.getElementById('sessionModeSwitcherHint');
      const challengeModeSwitcherBlock = document.getElementById('challengeModeSwitcherBlock');
      const challengeModeSwitcherHint = document.getElementById('challengeModeSwitcherHint');
      const isChallengeMode = Boolean(data && data.session && data.session.currentMode === 'challenge');

      if (headlineEl) {
        headlineEl.textContent = taskModel.headline;
      }
      if (hintEl) {
        if (isChallengeMode) {
          hintEl.textContent = '按钮只是帮你快速起手；如果你已经知道怎么回应，也可以直接在输入框里继续。';
        } else if (taskModel.primaryInputAction) {
          hintEl.textContent = '请围绕当前步骤输入内容，系统会自动附带正确动作。';
        } else if (taskModel.explicitChoices.length > 0) {
          hintEl.textContent = '当前阶段更适合直接点选动作，不需要再手动输入说明。';
        } else {
          hintEl.textContent = '当前阶段允许你直接补充上下文，系统会按当前模式继续推进。';
        }
      }
      if (taskSummary) {
        taskSummary.innerHTML = renderTaskSummary(taskModel);
      }

      const showGenericInput = isChallengeMode || Boolean(taskModel.primaryInputAction) || taskModel.explicitChoices.length === 0;
      if (composerLabel) {
        composerLabel.textContent = taskModel.headline;
      }
      if (inputWrap) {
        inputWrap.style.display = showGenericInput ? '' : 'none';
      }
      if (input) {
        input.required = showGenericInput;
      }
      if (actionInput) {
        actionInput.value = taskModel.primaryInputAction || '';
      }
      if (sendButton) {
        sendButton.style.display = showGenericInput ? '' : 'none';
        sendButton.textContent = taskModel.primaryButtonLabel || '发送本轮输入';
      }

      const explicitChoices = taskModel.explicitChoices.filter((choice) => choice.actionValue !== 'finalize');
      if (choicePanel) {
        choicePanel.innerHTML = explicitChoices.map((choice, index) => (
          '<button type="button"'
          + ' data-explicit-action="' + escapeHtml(choice.actionValue) + '"'
          + ' class="' + (index === 0 ? 'primary-choice' : '') + '"'
          + '>'
          + escapeHtml(choice.label)
          + '</button>'
        )).join('');
      }

      const showFinalizeForm = taskModel.explicitChoices.some((choice) => choice.actionValue === 'finalize');
      if (finalizeForm) {
        finalizeForm.style.display = showFinalizeForm ? '' : 'none';
      }
      if (modeSwitcher) {
        modeSwitcher.style.display = taskModel.showModeSwitcher ? '' : 'none';
      }
      if (modeSwitcherHint) {
        modeSwitcherHint.textContent = taskModel.showModeSwitcher
          ? '模式切换后会持续生效，直到你再次切换。'
          : '先处理完当前关键动作，再考虑切换模式。';
      }
      if (challengeModeSwitcherBlock) {
        challengeModeSwitcherBlock.style.display = isChallengeMode && taskModel.showModeSwitcher ? '' : (isChallengeMode ? 'none' : '');
      }
      if (challengeModeSwitcherHint) {
        challengeModeSwitcherHint.textContent = taskModel.showModeSwitcher
          ? '模式切换后会持续生效，直到你再次切换。'
          : '先处理完当前关键动作，再考虑切换模式。';
      }

      setActionControlsDisabled(disabled);
      return taskModel;
    }

    function setInlineMessage(elementId, message) {
      document.getElementById(elementId).textContent = message || '';
    }

    function formatDebugValue(value) {
      if (value instanceof Error) {
        return value.stack || value.message;
      }
      if (typeof value === 'string') {
        return value;
      }
      try {
        return JSON.stringify(value, null, 2);
      } catch (_error) {
        return String(value);
      }
    }

    function summarizeDebugData(data) {
      const text = formatDebugValue(data);
      return text.length > 500 ? text.slice(0, 500) + '…' : text;
    }

    function renderDebugLogs() {
      const panel = document.getElementById('debugLogList');
      if (!panel) {
        return;
      }

      if (debugLogs.length === 0) {
        panel.innerHTML = '<div class="empty">正在等待前端事件...</div>';
        return;
      }

      panel.innerHTML = debugLogs.map((entry) => (
        '<div class="debug-log-item">' +
          '<strong>' + escapeHtml(entry.kind) + ' · ' + escapeHtml(entry.message) + '</strong>' +
          '<div class="microcopy">' + escapeHtml(formatTimestamp(entry.timestamp)) + '</div>' +
          (entry.detail ? '<div class="debug-log-detail">' + escapeHtml(entry.detail) + '</div>' : '') +
        '</div>'
      )).join('');
    }

    function appendDebugLog(kind, message, detail) {
      debugLogs.unshift({
        kind,
        message,
        detail: detail ? summarizeDebugData(detail) : '',
        timestamp: new Date().toISOString(),
      });
      if (debugLogs.length > 20) {
        debugLogs.length = 20;
      }
      renderDebugLogs();
    }

    function setStatusBanner(kind, title, message) {
      const banner = document.getElementById('sessionStatusBanner');
      if (!title && !message) {
        banner.className = 'empty';
        banner.innerHTML = '切换模式、发送消息和定稿后，结果会立即刷新到时间线和右栏。';
        return;
      }

      const danger = kind === 'danger' ? ' danger' : '';
      const success = kind === 'success' ? ' success' : '';
      banner.className = 'callout' + danger + success;
      banner.innerHTML =
        '<strong>' + escapeHtml(title) + '</strong>' +
        (message ? '<p class="small">' + escapeHtml(message) + '</p>' : '');
    }

    function renderModePills(currentMode, disabled, challengeModeSwitchState) {
      for (const button of document.querySelectorAll('[data-mode]')) {
        const targetMode = button.dataset.mode || '';
        const gate = currentMode === 'challenge' && challengeModeSwitchState
          ? challengeModeSwitchState[targetMode]
          : null;
        const gateDisabled = Boolean(
          targetMode
          && targetMode !== currentMode
          && gate
          && gate.enabled === false
        );
        const blockedReason = gateDisabled && gate && gate.reason ? gate.reason : '';
        button.classList.toggle('active', targetMode === currentMode);
        button.disabled = disabled || gateDisabled;
        button.setAttribute('data-mode-blocked-reason', blockedReason);
        button.title = blockedReason;
      }
    }

    function artifactLabel(artifactType) {
      return REQUIREMENT_ARTIFACT_LABELS[artifactType] || artifactType;
    }

    function renderTimeline(messages) {
      if (!Array.isArray(messages) || messages.length === 0) {
        return '<div class="timeline-item"><strong>等待消息</strong><span class="microcopy">后续这里会显示用户消息、多角色发言和模式切换事件。</span></div>';
      }

      return messages.map((message) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(message.roleName || (message.speaker === 'user' ? '用户' : '系统')) + '</strong>' +
          '<div class="md-content">' + (typeof renderMarkdown === 'function' ? renderMarkdown(message.content) : escapeHtml(message.content)) + '</div>' +
          (message.timestamp ? '<div class="microcopy" style="margin-top: 8px;">' + escapeHtml(formatTimestamp(message.timestamp)) + '</div>' : '') +
        '</div>'
      )).join('');
    }

    function renderDraftArtifacts(drafts) {
      const entries = Object.entries(drafts || {});
      if (entries.length === 0) {
        return '<div class="empty">当前模式还没有结构化草稿产物。</div>';
      }

      return entries.map(([artifactType, artifact]) => {
        const content = artifact && typeof artifact === 'object' && 'content' in artifact
          ? String(artifact.content)
          : JSON.stringify(artifact, null, 2);
        return '' +
          '<div class="timeline-item">' +
            '<strong>' + escapeHtml(artifactLabel(artifactType)) + '</strong>' +
            '<div class="md-content">' + (typeof renderMarkdown === 'function' ? renderMarkdown(content) : escapeHtml(content)) + '</div>' +
          '</div>';
      }).join('');
    }

    function renderFinalizedArtifacts(finalized) {
      const entries = Object.entries(finalized || {}).filter(([, versions]) => Array.isArray(versions) && versions.length > 0);
      if (entries.length === 0) {
        return '<div class="empty">当前模式还没有定稿版本。</div>';
      }

      return entries.map(([artifactType, versions]) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(artifactLabel(artifactType)) + '</strong>' +
          '<div>' + versions.map((version) => {
            const note = version.note ? ' · ' + escapeHtml(version.note) : '';
            return '<div>v' + escapeHtml(version.version) + note + '</div>';
          }).join('') + '</div>' +
        '</div>'
      )).join('');
    }

    function renderSharedContext(sharedContext) {
      const facts = sharedContext && Array.isArray(sharedContext.confirmedFacts) ? sharedContext.confirmedFacts : [];
      const constraints = sharedContext && Array.isArray(sharedContext.hardConstraints) ? sharedContext.hardConstraints : [];
      const sources = sharedContext && Array.isArray(sharedContext.sourceReferences) ? sharedContext.sourceReferences : [];

      if (facts.length === 0 && constraints.length === 0 && sources.length === 0) {
        return '<div class="empty">当前还没有沉淀共享底稿。你可以直接在消息里用“事实：”“约束：”“参考：”来显式记录。</div>';
      }

      const sections = [];
      if (facts.length > 0) {
        sections.push('<div class="timeline-item"><strong>已确认事实</strong><div>' + facts.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }
      if (constraints.length > 0) {
        sections.push('<div class="timeline-item"><strong>硬约束</strong><div>' + constraints.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }
      if (sources.length > 0) {
        sections.push('<div class="timeline-item"><strong>参考资料</strong><div>' + sources.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }

      return sections.join('');
    }

    function updateComposerHint(currentMode) {
      const input = document.getElementById('sessionMessageInput');
      if (currentMode === 'challenge') {
        input.placeholder = latestChallengeModel && latestChallengeModel.focusCard
          ? latestChallengeModel.focusCard.inputPlaceholder
          : '继续追问、补充事实、提出反例，或者要求某个角色从另一个角度继续挑战。';
        return;
      }
      if (currentMode === 'decision') {
        input.placeholder = '要求比较方案、说明取舍、给出建议，或者逼它明确风险和前提条件。';
        return;
      }
      input.placeholder = '要求整理成想法、规格、验收或任务草稿，或者补充结构和验收标准。';
    }

    function syncFinalizeControls(data, disabled) {
      const button = document.getElementById('finalizeArtifactsButton');
      const noteInput = document.getElementById('finalizeNote');
      const currentMode = data && data.session ? data.session.currentMode : '';
      const drafts = data && data.artifacts && data.artifacts.drafts ? Object.keys(data.artifacts.drafts) : [];
      const finalizedEntries = data && data.artifacts && data.artifacts.finalized
        ? Object.values(data.artifacts.finalized)
        : [];
      const versions = finalizedEntries.reduce((max, item) => (
        Array.isArray(item) ? Math.max(max, item.length) : max
      ), 0);

      const canFinalize = currentMode === 'requirement-build' && drafts.length > 0 && !disabled;
      button.disabled = !canFinalize;
      noteInput.disabled = currentMode !== 'requirement-build' || disabled;
      button.textContent = versions > 0 ? '生成下一版' : '生成首版';
    }

    function applySessionData(data, options) {
      const disabled = Boolean(options && options.disabled);
      latestSessionData = data;
      renderModePills(
        data.session.currentMode,
        disabled,
        data.session && data.session.currentMode === 'challenge'
          ? buildChallengeModeSwitchState(data.session)
          : null,
      );
      if (data && data.session) {
        data.session.status = formatSessionStatusLabel(data.session.status);
      }
      if (data && data.modeState && Array.isArray(data.modeState.messages)) {
        data.modeState.messages = data.modeState.messages.map((message) => ({
          ...message,
          roleName: formatTimelineSpeakerLabel(message),
          content: formatTimelineMessageContent(message),
        }));
      }

      // ── Phase banner (currentPhase / requiredUserAction) ───────────────────
      const phaseBanner = document.getElementById('sessionPhaseBanner');
      const phaseLabel = document.getElementById('sessionPhaseLabel');
      const interactionStateEl = document.getElementById('sessionInteractionState');
      const lastStepEl = document.getElementById('sessionLastStep');
      const handoffHintEl = document.getElementById('sessionHandoffHint');
      const modeWarningEl = document.getElementById('sessionModeWarning');
      const rollbackHintEl = document.getElementById('sessionRollbackHint');
      const currentPhase = formatSessionPhaseLabel(data.session && data.session.currentPhase);
      const interactionState = data.session && data.session.interactionState;
      const requiredUserAction = formatSessionActionLabel(data.session && data.session.requiredUserAction) || (data.session && data.session.requiredUserAction);
      const lastCompletedStep = formatSessionLastStepLabel(data.session && data.session.lastCompletedStep);
      const nextRecommendedMode = data.session && data.session.nextRecommendedMode;
      const modeTransitionWarning = formatSessionActionLabel(data.session && data.session.modeTransitionWarning) || (data.session && data.session.modeTransitionWarning);
      const recommendedRollbackMode = data.session && data.session.recommendedRollbackMode;
      if (phaseBanner && currentPhase) {
        phaseBanner.style.display = '';
        if (phaseLabel) phaseLabel.textContent = formatSessionPhaseLabel(currentPhase);
        if (interactionStateEl) interactionStateEl.textContent = interactionState ? interactionStateLabel(interactionState) : '';
        if (lastStepEl) lastStepEl.textContent = formatSessionLastStepLabel(lastCompletedStep || '');
        if (handoffHintEl) handoffHintEl.textContent = nextRecommendedMode ? '建议下一步切换到：' + modeLabel(nextRecommendedMode) : '';
        if (modeWarningEl) modeWarningEl.textContent = formatSessionActionLabel(modeTransitionWarning || '') || modeTransitionWarning || '';
        if (rollbackHintEl) rollbackHintEl.textContent = recommendedRollbackMode ? '建议先回退到：' + modeLabel(recommendedRollbackMode) : '';
      }

      const taskModel = syncPrimaryActionPanel(data, disabled);
      syncChallengeWorkbench(data, taskModel);
      updateComposerHint(data.session.currentMode);
      const composerInput = document.getElementById('sessionMessageInput');
      if (
        composerInput
        && data.session
        && data.session.currentMode === 'challenge'
        && data.session.currentPhase === 'topic_submitted'
        && !composerInput.value.trim()
      ) {
        composerInput.value = data.session.topic || '';
      }

      document.getElementById('sessionMeta').innerHTML =
        '<div class="meta-grid">' +
          '<div class="timeline-item"><strong>议题</strong>' + escapeHtml(data.session.topic) + '</div>' +
          '<div class="timeline-item"><strong>当前模式</strong>' + escapeHtml(modeLabel(data.session.currentMode)) + '</div>' +
          '<div class="timeline-item"><strong>当前阶段</strong>' + escapeHtml(currentPhase || '') + '</div>' +
          '<div class="timeline-item"><strong>交互状态</strong>' + escapeHtml(interactionStateLabel(interactionState)) + '</div>' +
          '<div class="timeline-item"><strong>状态</strong>' + escapeHtml(data.session.status) + '</div>' +
          '<div class="timeline-item"><strong>最近活跃</strong>' + escapeHtml(formatTimestamp(data.session.lastActiveAt || data.session.updatedAt || '')) + '</div>' +
        '</div>';
      document.getElementById('timeline').innerHTML = renderTimeline(data.modeState && data.modeState.messages);
      document.getElementById('sharedContextPanel').innerHTML = renderSharedContext(data.session && data.session.sharedContext);
      document.getElementById('draftPanel').innerHTML = data.modeState && data.modeState.draftSummary
        ? '<div class="timeline-item"><strong>当前模式草稿</strong><div>' + (typeof renderMarkdown === 'function' ? renderMarkdown(data.modeState.draftSummary.summary) : escapeHtml(data.modeState.draftSummary.summary)) + '</div></div>'
        : '<div class="empty">当前模式还没有草稿摘要。</div>';
      document.getElementById('draftArtifactsPanel').innerHTML = renderDraftArtifacts(data.artifacts && data.artifacts.drafts);
      document.getElementById('finalizedArtifactsPanel').innerHTML = renderFinalizedArtifacts(data.artifacts && data.artifacts.finalized);
      syncFinalizeControls(data, disabled);
      if (!taskModel.primaryInputAction && taskModel.explicitChoices.length > 0) {
        setInlineMessage('sessionComposerError', '');
      }
    }

    function shouldAutoStartChallengeTopic(data) {
      const session = data && data.session;
      if (!session || session.currentMode !== 'challenge' || session.currentPhase !== 'topic_submitted') {
        return false;
      }

      if (challengeTopicBootstrapAttempted || challengeTopicBootstrapInFlight) {
        return false;
      }

      const lastCompletedStep = String(session.lastCompletedStep || '');
      if (lastCompletedStep.startsWith('mode switched to ')) {
        return false;
      }

      const messages = data && data.modeState && Array.isArray(data.modeState.messages)
        ? data.modeState.messages
        : [];

      return Boolean(session.topic) && messages.length === 0;
    }

    async function autoStartChallengeTopic(data) {
      if (!shouldAutoStartChallengeTopic(data)) {
        return false;
      }

      challengeTopicBootstrapAttempted = true;
      challengeTopicBootstrapInFlight = true;
      const composerInput = document.getElementById('sessionMessageInput');
      if (composerInput && !composerInput.value.trim()) {
        composerInput.value = data.session.topic;
      }

      try {
        await postSessionTurn(
          {
            content: data.session.topic,
            action: 'raw_topic',
          },
          {
            title: '正在根据首页议题启动第一轮…',
            message: '进入会话后会直接用首页议题发起第一轮 framing，你不需要再重复输入一遍。',
          },
        );
        return true;
      } catch (_error) {
        return false;
      } finally {
        challengeTopicBootstrapInFlight = false;
      }
    }

    async function readJson(response) {
      const data = await response.json().catch(() => ({}));
      return data && typeof data === 'object' ? data : {};
    }

    async function postSessionTurn(payload, statusMessage) {
      const body = {
        content: payload.content,
        ...(payload.action ? { action: payload.action } : {}),
        ...(payload.focusAction ? { focusAction: payload.focusAction } : {}),
      };

      setInlineMessage('sessionComposerError', '');
      setInlineMessage('finalizeArtifactsError', '');
      setStatusBanner('', statusMessage.title, statusMessage.message);
      renderModePills(latestSessionData && latestSessionData.session ? latestSessionData.session.currentMode : '', true);
      setActionControlsDisabled(true);
      appendDebugLog('request', 'POST ' + sessionMessagePath, body);

      try {
        const response = await fetch(sessionMessagePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await readJson(response);
        appendDebugLog('response', response.status + ' POST ' + sessionMessagePath, data);
        if (!response.ok) {
          throw new Error(data.error || '无法发送消息');
        }

        applySessionData(data, { disabled: false });
        return data;
      } catch (error) {
        appendDebugLog('catch', 'postSessionTurn failed', error);
        const message = error instanceof Error ? error.message : '无法发送消息';
        if (latestSessionData) {
          applySessionData(latestSessionData, { disabled: false });
        } else {
          setActionControlsDisabled(false);
        }
        setInlineMessage('sessionComposerError', message);
        setStatusBanner('danger', '消息发送失败', message);
        throw error;
      }
    }

    async function runExplicitChoice(actionValue) {
      appendDebugLog('click', 'explicit action selected', { actionValue });

      if (actionValue.startsWith('switch:')) {
        await switchMode(actionValue.slice('switch:'.length));
        return;
      }

      if (actionValue === 'finalize') {
        document.getElementById('finalizeArtifactsForm').requestSubmit();
        return;
      }

      if (actionValue === 'idea' || actionValue === 'spec' || actionValue === 'acceptance' || actionValue === 'tasks') {
        await postSessionTurn(
          {
            content: artifactLabel(actionValue),
            action: 'artifact_selection',
          },
          {
            title: '正在生成草稿…',
            message: '系统会按你选中的产物层级生成第一版草稿。',
          },
        );
        return;
      }

      if (actionValue === 'round_resolution') {
        await postSessionTurn(
          {
            content: '\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee',
            action: 'round_resolution',
          },
          {
            title: '\u6b63\u5728\u521d\u59cb\u5316\u4e0b\u4e00\u8f6e\u8ffd\u95ee\u2026',
            message: '\u7cfb\u7edf\u4f1a\u56de\u5230\u5f53\u524d\u4f1a\u8bdd\u7684\u4e0b\u4e00\u8f6e\u8f93\u5165\u72b6\u6001\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002',
          },
        );
        return;
      }

      if (actionValue === 'decision_resolution') {
        await postSessionTurn(
          {
            content: '继续讨论裁决',
            action: 'decision_resolution',
          },
          {
            title: '正在收束当前裁决…',
            message: '系统会记录当前结论，并准备接受下一个决策问题。',
          },
        );
      }
    }

    async function loadSession(statusMessage) {
      appendDebugLog('request', 'GET ' + sessionPath);
      try {
        const response = await fetch(sessionPath);
        const data = await readJson(response);
        appendDebugLog('response', response.status + ' GET ' + sessionPath, data);
        if (!response.ok) {
          document.getElementById('sessionMeta').innerHTML =
            '<div class="callout danger"><strong>无法加载会话。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          document.getElementById('draftPanel').innerHTML =
            '<div class="callout danger"><strong>无法加载草稿。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          return;
        }

        applySessionData(data, { disabled: false });
        const kickedOff = await autoStartChallengeTopic(data);
        if (kickedOff) {
          return;
        }
        if (statusMessage) {
          setStatusBanner('success', statusMessage.title, statusMessage.message);
        } else {
          setStatusBanner('', '', '');
        }
      } catch (error) {
        appendDebugLog('catch', 'loadSession failed', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        document.getElementById('sessionMeta').innerHTML =
          '<div class="callout danger"><strong>无法加载会话。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('draftPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载草稿。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('draftArtifactsPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载草稿产物。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('finalizedArtifactsPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载定稿版本。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        setStatusBanner('danger', '会话刷新失败', message);
      }
    }

    async function switchMode(mode) {
      setInlineMessage('sessionComposerError', '');
      setInlineMessage('finalizeArtifactsError', '');
      setStatusBanner('', '正在切换模式…', '请稍候，当前会话会刷新到新的思考模式。');
      renderModePills(mode, true);
      setActionControlsDisabled(true);
      appendDebugLog('request', 'POST ' + sessionModePath, { mode });

      try {
        const response = await fetch(sessionModePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
        const data = await readJson(response);
        appendDebugLog('response', response.status + ' POST ' + sessionModePath, data);
        if (!response.ok) {
          throw new Error(data.error || '无法切换模式');
        }

        applySessionData(data, { disabled: false });
        setStatusBanner('success', '模式已切换', '当前会话已进入 ' + modeLabel(data.session.currentMode) + '。');
      } catch (error) {
        appendDebugLog('catch', 'switchMode failed', error);
        const message = error instanceof Error ? error.message : '无法切换模式';
        if (latestSessionData) {
          applySessionData(latestSessionData, { disabled: false });
        } else {
          setActionControlsDisabled(false);
        }
        setStatusBanner('danger', '模式切换失败', message);
      }
    }

    async function submitMessage(event) {
      event.preventDefault();
      appendDebugLog('submit', 'sessionMessageForm submitted');
      const form = event.currentTarget;
      const input = document.getElementById('sessionMessageInput');
      const rawAction = document.getElementById('sessionMessageAction').value.trim();
      const focusActionInput = document.getElementById('sessionMessageFocusAction');
      const focusAction = focusActionInput ? focusActionInput.value.trim() : '';
      const session = latestSessionData && latestSessionData.session ? latestSessionData.session : null;
      const action = resolveClientChallengeAction(session, rawAction);
      const useProblemCorrectionForm = Boolean(
        session
        && session.currentMode === 'challenge'
        && session.currentPhase === 'waiting_user_problem_correction'
      );
      let content = input.value.trim();
      if (useProblemCorrectionForm) {
        const draft = readProblemCorrectionDraftFromForm();
        const checklist = buildProblemCorrectionChecklistFromDraft(draft);
        const missing = checklist.filter((item) => !item.done).map((item) => item.label);
        if (missing.length > 0) {
          setInlineMessage('sessionComposerError', '当前这一步还缺这些内容：' + missing.join('、') + '。');
          syncChallengeProblemCorrectionForm(session, latestChallengeModel);
          return;
        }
        content = serializeChallengeProblemCorrectionForm(draft);
      }
      if (!content) {
        setInlineMessage('sessionComposerError', '请输入本轮要推进的内容。');
        return;
      }

      const challengeValidationError = validateChallengeComposerInput(
        session,
        action,
        content,
        focusAction,
      );
      if (challengeValidationError) {
        setInlineMessage('sessionComposerError', challengeValidationError);
        return;
      }

      try {
        const data = await postSessionTurn(
          {
            content,
            action,
            ...(focusAction ? { focusAction } : {}),
          },
          {
            title: '正在生成本轮输出…',
            message: '系统会把这条输入送到当前模式。质疑模式通常需要 20-60 秒，完成后会自动刷新时间线与右栏。',
          },
        );
        form.reset();
        if (useProblemCorrectionForm) {
          const notesInput = document.getElementById('challengeProblemNotesInput');
          const problemDefinitionInput = document.getElementById('challengeProblemDefinitionInput');
          const scenarioInput = document.getElementById('challengeScenarioInput');
          if (problemDefinitionInput) problemDefinitionInput.value = '';
          if (scenarioInput) scenarioInput.value = '';
          if (notesInput) notesInput.value = '';
          const topPainsRoot = getProblemCorrectionListRoot('topPains');
          const constraintsRoot = getProblemCorrectionListRoot('constraints');
          if (topPainsRoot) {
            topPainsRoot.innerHTML = [
              renderProblemCorrectionListRowHtml('topPains', problemCorrectionListConfig('topPains').placeholder, ''),
              renderProblemCorrectionListRowHtml('topPains', problemCorrectionListConfig('topPains').placeholder, ''),
              renderProblemCorrectionListRowHtml('topPains', problemCorrectionListConfig('topPains').placeholder, ''),
            ].join('');
          }
          if (constraintsRoot) {
            constraintsRoot.innerHTML = renderProblemCorrectionListRowHtml('constraints', problemCorrectionListConfig('constraints').placeholder, '');
          }
          syncChallengeProblemCorrectionForm(data.session, latestChallengeModel);
        }
        syncChallengeFocusSelection('');
        document.getElementById('sessionMessageAction').value = data && data.session
          ? buildClientSessionTaskModel(data.session, data.artifacts || {}, data.modeState || null).primaryInputAction || ''
          : '';
        updateComposerHint(data.session.currentMode);
        input.focus();
        setStatusBanner('success', '本轮已完成', '新的角色发言和草稿摘要已经刷新。');
      } catch (error) {
        return;
      }
    }

    async function finalizeArtifacts(event) {
      event.preventDefault();
      const note = document.getElementById('finalizeNote').value.trim();
      setInlineMessage('finalizeArtifactsError', '');
      setStatusBanner('', '正在生成新版本…', '定稿不会覆盖旧版本，完成后右栏会刷新。');
      setActionControlsDisabled(true);
      document.getElementById('finalizeArtifactsButton').disabled = true;
      appendDebugLog('request', 'POST ' + sessionFinalizePath, { note });

      try {
        const response = await fetch(sessionFinalizePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        });
        const data = await readJson(response);
        appendDebugLog('response', response.status + ' POST ' + sessionFinalizePath, data);
        if (!response.ok) {
          throw new Error(data.error || '无法定稿');
        }

        applySessionData(data, { disabled: false });
        document.getElementById('finalizeNote').value = '';
        setStatusBanner('success', '新版本已生成', '右栏中的已定稿版本已经更新。');
      } catch (error) {
        appendDebugLog('catch', 'finalizeArtifacts failed', error);
        const message = error instanceof Error ? error.message : '无法定稿';
        if (latestSessionData) {
          applySessionData(latestSessionData, { disabled: false });
        } else {
          syncFinalizeControls({ session: { currentMode: 'requirement-build' }, artifacts: { drafts: { placeholder: true }, finalized: {} } }, false);
        }
        setInlineMessage('finalizeArtifactsError', message);
        setStatusBanner('danger', '定稿失败', message);
      }
    }

    window.addEventListener('error', (event) => {
      const location = [event.filename, event.lineno, event.colno].filter(Boolean).join(':');
      appendDebugLog('window.error', event.message || 'Unknown window error', location || event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      appendDebugLog('unhandledrejection', 'Unhandled promise rejection', event.reason);
    });

    for (const button of document.querySelectorAll('[data-mode]')) {
      button.addEventListener('click', () => switchMode(button.dataset.mode));
    }

    document.getElementById('sessionSendButton').addEventListener('click', () => appendDebugLog('click', 'sessionSendButton clicked'));
    document.getElementById('sessionPrimaryActionButtons').addEventListener('click', async (event) => {
      const target = event.target.closest('[data-explicit-action]');
      if (!target) {
        return;
      }

      await runExplicitChoice(target.dataset.explicitAction || '');
    });
    document.getElementById('challengeFocusActions').addEventListener('click', (event) => {
      const target = event.target.closest('[data-focus-action]');
      if (!target) {
        return;
      }

      const input = document.getElementById('sessionMessageInput');
      const label = document.getElementById('sessionComposerLabel');
      const focusActionInput = document.getElementById('sessionMessageFocusAction');
      const problemForm = document.getElementById('challengeProblemCorrectionForm');
      const notesInput = document.getElementById('challengeProblemNotesInput');
      if (focusActionInput) {
        focusActionInput.value = target.dataset.focusAction || '';
      }
      syncChallengeFocusSelection(target.dataset.focusAction || '');
      if (problemForm && problemForm.style.display !== 'none' && notesInput) {
        notesInput.value = target.dataset.focusActionTemplate || '';
        notesInput.focus();
      } else {
        input.value = target.dataset.focusActionTemplate || '';
        if (label) {
          label.textContent = target.dataset.focusInputLabel || label.textContent;
        }
        input.placeholder = target.dataset.focusPlaceholder || input.placeholder;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
    document.getElementById('challengeProblemCorrectionForm').addEventListener('input', () => {
      const session = latestSessionData && latestSessionData.session ? latestSessionData.session : null;
      setInlineMessage('sessionComposerError', '');
      syncChallengeProblemCorrectionForm(session, latestChallengeModel);
    });
    document.getElementById('challengeProblemCorrectionForm').addEventListener('click', (event) => {
      const addTarget = event.target.closest('[data-add-list]');
      if (addTarget) {
        addProblemCorrectionListItem(addTarget.dataset.addList || '');
        const session = latestSessionData && latestSessionData.session ? latestSessionData.session : null;
        syncChallengeProblemCorrectionForm(session, latestChallengeModel);
        return;
      }

      const removeTarget = event.target.closest('[data-remove-list]');
      if (!removeTarget) {
        return;
      }
      const fieldName = removeTarget.dataset.removeList || '';
      const config = problemCorrectionListConfig(fieldName);
      const root = getProblemCorrectionListRoot(fieldName);
      if (!root) {
        return;
      }
      const rows = root.querySelectorAll('[data-remove-list="' + fieldName + '"]');
      if (rows.length <= config.minItems) {
        return;
      }
      const row = removeTarget.closest('.inline-form');
      if (row) {
        row.remove();
      }
      syncProblemCorrectionListControls(fieldName);
      const session = latestSessionData && latestSessionData.session ? latestSessionData.session : null;
      syncChallengeProblemCorrectionForm(session, latestChallengeModel);
    });
    document.getElementById('challengeProblemCorrectionAssist').addEventListener('click', async () => {
      const session = latestSessionData && latestSessionData.session ? latestSessionData.session : null;
      if (!session || session.currentMode !== 'challenge' || session.currentPhase !== 'waiting_user_problem_correction') {
        return;
      }
      const draft = readProblemCorrectionDraftFromForm();
      const content = serializeChallengeProblemCorrectionForm(draft);
      setInlineMessage('sessionComposerError', '');
      setStatusBanner('', '正在整理问题修正表单…', '系统会把你当前填写的内容拆成更清晰的字段建议。');
      appendDebugLog('request', 'POST ' + sessionProblemCorrectionAssistPath, { content });

      try {
        const response = await fetch(sessionProblemCorrectionAssistPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const data = await readJson(response);
        appendDebugLog('response', response.status + ' POST ' + sessionProblemCorrectionAssistPath, data);
        if (!response.ok) {
          throw new Error(data.error || '无法整理问题修正表单');
        }
        applyProblemCorrectionSuggestion(data.suggestion || {});
        syncChallengeProblemCorrectionForm(session, latestChallengeModel);
        const reminders = Array.isArray(data.reminders) && data.reminders.length > 0
          ? '建议：' + data.reminders.join('；')
          : '表单字段已经帮你整理好了，可以直接再检查一遍后提交。';
        setStatusBanner('success', '问题修正已整理', reminders);
      } catch (error) {
        const message = error instanceof Error ? error.message : '无法整理问题修正表单';
        setInlineMessage('sessionComposerError', message);
        setStatusBanner('danger', '智能整理失败', message);
      }
    });
    document.getElementById('challengeRoundSummaryToggle').addEventListener('click', () => {
      setChallengeContextExpanded(!challengeContextExpanded);
    });
    document.getElementById('challengeHistoryNav').addEventListener('click', (event) => {
      const target = event.target.closest('[data-history-index]');
      if (!target || !latestChallengeModel) {
        return;
      }

      const index = Number(target.dataset.historyIndex);
      const group = latestChallengeModel.historyGroups && latestChallengeModel.historyGroups[index];
      document.getElementById('challengeHistoryPreview').innerHTML = renderChallengeHistoryPreview(group || null);
      for (const button of document.querySelectorAll('.challenge-history-button')) {
        button.classList.toggle('current', button === target);
      }
    });
    document.getElementById('sessionMessageForm').addEventListener('submit', submitMessage);
    document.getElementById('finalizeArtifactsForm').addEventListener('submit', finalizeArtifacts);
    appendDebugLog('init', 'session page script loaded', sessionPath);
    renderDebugLogs();
    syncExportLink();
    loadSession();
  </script>
`);

export const renderSessionHistoryPage = () => layout('Sessions', `
  <section class="section-header">
    <div class="eyebrow">按议题回看</div>
    <h1>会话历史</h1>
    <p>按议题、最近活跃时间和当前模式查看会话，而不是按 workflow run 组织。</p>
  </section>
  <section class="grid">
    <div class="card" id="sessionHistoryGuide">
      <div class="panel-eyebrow">恢复工作</div>
      <h2>先看什么，再做什么</h2>
      <div class="stage-list">
        <div class="stage active">先看当前阶段和交互状态，确认系统是在等你输入、还是在等待你做选择。</div>
        <div class="stage">按“下一步动作”恢复工作，不要先去翻完整回放。</div>
        <div class="stage">只有需要追溯分歧来源时，再打开回放看完整过程。</div>
      </div>
    </div>
    <div class="card">
      <h2>最近会话</h2>
      <div id="sessionHistoryList" class="empty" aria-live="polite">正在加载会话历史...</div>
    </div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

${sessionLabelScript}

    function modeLabel(mode) {
      if (mode === 'challenge') return '质疑模式';
      if (mode === 'decision') return '裁决模式';
      if (mode === 'requirement-build') return '需求共建模式';
      return String(mode || '未知模式');
    }

    function interactionStateLabel(interactionState) {
      if (interactionState === 'running_ai_step') return '系统正在处理';
      if (interactionState === 'ready_to_finalize') return '可收束或定稿';
      if (interactionState === 'blocked') return '当前被阻塞';
      if (interactionState === 'completed') return '会话已完成';
      if (interactionState === 'idle') return '尚未开始';
      return '等待你的输入';
    }

    function formatTimestamp(value) {
      if (!value) {
        return '';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }

    function renderSessionItems(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return '<div class="empty"><strong>还没有会话历史。</strong><p class="small">先从首页输入一个严肃议题，再进入会话。</p></div>';
      }

      return items.map((item) => (
        '<article class="result-section">' +
          '<h3><a href="/sessions/' + encodeURIComponent(item.sessionId) + '">' + escapeHtml(item.topic) + '</a></h3>' +
          '<div class="meta-grid">' +
            '<div class="timeline-item"><strong>当前模式</strong>' + escapeHtml(modeLabel(item.currentMode)) + '</div>' +
            '<div class="timeline-item"><strong>当前阶段</strong>' + escapeHtml(formatSessionPhaseLabel(item.currentPhase) || item.currentPhase || '') + '</div>' +
            '<div class="timeline-item"><strong>交互状态</strong>' + escapeHtml(interactionStateLabel(item.interactionState)) + '</div>' +
            '<div class="timeline-item"><strong>最近活跃</strong>' + escapeHtml(formatTimestamp(item.lastActiveAt)) + '</div>' +
          '</div>' +
          '<div class="callout" style="margin-top:12px;">' +
            '<strong>下一步动作</strong>' +
            '<p class="small" style="margin:4px 0 0;">' + escapeHtml(formatSessionActionLabel(item.requiredUserAction) || item.requiredUserAction || '返回会话继续推进。') + '</p>' +
            (item.lastCompletedStep ? '<p class="small" style="margin:8px 0 0;">最近完成：' + escapeHtml(formatSessionLastStepLabel(item.lastCompletedStep) || item.lastCompletedStep) + '</p>' : '') +
            ((item.hasDraftArtifacts || item.hasFinalizedArtifacts)
              ? '<p class="small" style="margin:8px 0 0;">当前沉淀：'
                + (item.hasDraftArtifacts ? '已有草稿' : '暂无草稿')
                + ' / '
                + (item.hasFinalizedArtifacts ? '已有定稿' : '暂无定稿')
                + '</p>'
              : '') +
            (item.nextRecommendedMode ? '<p class="small" style="margin:8px 0 0;">建议下一模式：' + escapeHtml(modeLabel(item.nextRecommendedMode)) + '</p>' : '') +
            (item.recommendedRollbackMode ? '<p class="small" style="margin:8px 0 0;">建议先回退到：' + escapeHtml(modeLabel(item.recommendedRollbackMode)) + '</p>' : '') +
          '</div>' +
          '<div class="actions">' +
            '<a class="button" href="/sessions/' + encodeURIComponent(item.sessionId) + '">继续这个会话</a>' +
            '<a class="button secondary" href="/sessions/' + encodeURIComponent(item.sessionId) + '/replay">查看回放</a>' +
          '</div>' +
        '</article>'
      )).join('');
    }

    async function loadSessionHistory() {
      try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        document.getElementById('sessionHistoryList').innerHTML = renderSessionItems(data.sessions);
      } catch (error) {
        document.getElementById('sessionHistoryList').innerHTML =
          '<div class="callout danger"><strong>无法加载会话历史。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadSessionHistory();
  </script>
`);

export const renderSessionReplayPage = (sessionId: string) => layout('Replay', `
  <section class="section-header">
    <div class="eyebrow">过程回放</div>
    <h1>会话回放</h1>
    <p>会话编号：<code>${escapeHtml(sessionId)}</code></p>
  </section>
  <section class="grid">
    <div class="card" id="replayResumePanel">
      <div class="panel-eyebrow">恢复工作</div>
      <h2>如何继续这个会话</h2>
      <div id="replayResumeHint" class="empty" aria-live="polite">正在分析当前会话应该如何继续…</div>
      <div class="actions">
        <a id="replayReturnLink" class="button" href="/sessions/${escapeHtml(sessionId)}">继续这个会话</a>
      </div>
    </div>
    <div class="card">
      <h2>回放概览</h2>
      <div id="replayMeta" class="empty" aria-live="polite">正在加载回放...</div>
    </div>
    <div class="card">
      <h2>定稿产物</h2>
      <div id="replayArtifacts" class="empty" aria-live="polite">正在加载定稿产物...</div>
    </div>
  </section>
  <section class="card section">
    <h2>事件时间线</h2>
    <div id="replayTimeline" class="timeline">
      <div class="timeline-item">
        <strong>正在加载</strong>
        <span class="microcopy">这里会显示模式切换、角色发言、草稿更新和定稿节点。</span>
      </div>
    </div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

${sessionLabelScript}

    function modeLabel(mode) {
      if (mode === 'challenge') return '质疑模式';
      if (mode === 'decision') return '裁决模式';
      if (mode === 'requirement-build') return '需求共建模式';
      return String(mode || '未知模式');
    }

    function interactionStateLabel(interactionState) {
      if (interactionState === 'running_ai_step') return '系统正在处理';
      if (interactionState === 'ready_to_finalize') return '可收束或定稿';
      if (interactionState === 'blocked') return '当前被阻塞';
      if (interactionState === 'completed') return '会话已完成';
      if (interactionState === 'idle') return '尚未开始';
      return '等待你的输入';
    }

    function formatTimestamp(value) {
      if (!value) {
        return '';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }

    function artifactLabel(artifactType) {
      return REQUIREMENT_ARTIFACT_LABELS[artifactType] || artifactType;
    }

    function buildReplayResumePanel(session) {
      return '<div class="callout">' +
        '<strong>当前阶段</strong>' +
        '<p class="small" style="margin:4px 0 0;">' + escapeHtml(formatSessionPhaseLabel(session.currentPhase) || session.currentPhase || '') + '</p>' +
        '<p class="small" style="margin:8px 0 0;">交互状态：' + escapeHtml(interactionStateLabel(session.interactionState)) + '</p>' +
        '<p class="small" style="margin:8px 0 0;">下一步：' + escapeHtml(formatSessionActionLabel(session.requiredUserAction) || session.requiredUserAction || '返回会话继续推进。') + '</p>' +
        (session.lastCompletedStep ? '<p class="small" style="margin:8px 0 0;">最近完成：' + escapeHtml(formatSessionLastStepLabel(session.lastCompletedStep) || session.lastCompletedStep) + '</p>' : '') +
        (session.nextRecommendedMode ? '<p class="small" style="margin:8px 0 0;">建议下一模式：' + escapeHtml(modeLabel(session.nextRecommendedMode)) + '</p>' : '') +
        (session.recommendedRollbackMode ? '<p class="small" style="margin:8px 0 0;">建议回退到：' + escapeHtml(modeLabel(session.recommendedRollbackMode)) + '</p>' : '') +
      '</div>';
    }

    function renderReplayEvents(events) {
      if (!Array.isArray(events) || events.length === 0) {
        return '<div class="empty">当前会话还没有可回放的事件。</div>';
      }

      return events.map((event) => {
        if (event.type === 'mode_switched') {
          return '<div class="timeline-item"><strong>模式切换</strong><div>' + escapeHtml(modeLabel(event.fromMode) + ' -> ' + modeLabel(event.toMode)) + '</div>' +
            '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        if (event.type === 'artifact_finalized') {
          return '<div class="timeline-item"><strong>产物定稿</strong><div>' + escapeHtml(artifactLabel(event.artifactType)) + ' v' + escapeHtml(event.version) + '</div>' +
            '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        if (event.type === 'role_message') {
          return '<div class="timeline-item"><strong>' + escapeHtml(event.roleName) + '</strong><div>' + escapeHtml(event.content) + '</div>' +
            '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        if (event.type === 'draft_updated') {
          return '<div class="timeline-item"><strong>草稿更新</strong><div>' + escapeHtml(event.summary) + '</div>' +
            '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        if (event.type === 'phase_transition') {
          return '<div class="timeline-item"><strong>阶段推进</strong><div>' +
            escapeHtml((formatSessionPhaseLabel(event.fromPhase) || event.fromPhase) + ' -> ' + (formatSessionPhaseLabel(event.toPhase) || event.toPhase)) +
            '</div><div class="small" style="margin-top:8px;">下一步：' +
            escapeHtml(formatSessionActionLabel(event.requiredUserAction) || event.requiredUserAction) +
            '</div><div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        if (event.type === 'shared_context_updated') {
          const sections = [];
          if (Array.isArray(event.confirmedFacts) && event.confirmedFacts.length > 0) {
            sections.push('已确认事实：' + event.confirmedFacts.map((item) => escapeHtml(item)).join('；'));
          }
          if (Array.isArray(event.hardConstraints) && event.hardConstraints.length > 0) {
            sections.push('硬约束：' + event.hardConstraints.map((item) => escapeHtml(item)).join('；'));
          }
          if (Array.isArray(event.sourceReferences) && event.sourceReferences.length > 0) {
            sections.push('参考资料：' + event.sourceReferences.map((item) => escapeHtml(item)).join('；'));
          }
          return '<div class="timeline-item"><strong>共享底座更新</strong><div>' + sections.join('<br>') + '</div>' +
            '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
        }
        return '<div class="timeline-item"><strong>用户消息</strong><div>' + escapeHtml(event.content || '') + '</div>' +
          '<div class="microcopy" style="margin-top:8px;">' + escapeHtml(formatTimestamp(event.timestamp)) + '</div></div>';
      }).join('');
    }

    function renderReplayArtifacts(artifacts) {
      const requirementArtifacts = artifacts && artifacts['requirement-build'];
      const finalized = requirementArtifacts && requirementArtifacts.finalized;
      const entries = Object.entries(finalized || {}).filter(([, versions]) => Array.isArray(versions) && versions.length > 0);
      if (entries.length === 0) {
        return '<div class="empty">当前回放还没有定稿产物。</div>';
      }

      return entries.map(([artifactType, versions]) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(artifactLabel(artifactType)) + '</strong>' +
          '<div>' + versions.map((version) => '<div>v' + escapeHtml(version.version) + (version.note ? ' · ' + escapeHtml(version.note) : '') + '</div>').join('') + '</div>' +
        '</div>'
      )).join('');
    }

    function renderLegacyReplay(legacy) {
      document.getElementById('replayResumeHint').innerHTML =
        '<div class="callout"><strong>旧版兼容记录</strong><p class="small" style="margin:4px 0 0;">这条记录来自旧 workflow 历史，只能回看结果，不能恢复到会话状态机。</p></div>';
      document.getElementById('replayMeta').innerHTML =
        '<div class="timeline-item"><strong>旧版兼容记录</strong><div>' + escapeHtml(legacy.run.idea) + '</div></div>' +
        '<div class="timeline-item"><strong>旧版状态</strong><div>' + escapeHtml(legacy.run.status) + '</div></div>';
      document.getElementById('replayTimeline').innerHTML =
        '<div class="timeline-item"><strong>旧版流程</strong><div>' + escapeHtml(legacy.run.status) + '</div></div>';
      document.getElementById('replayArtifacts').innerHTML =
        legacy.result && legacy.result.decision
          ? '<div class="timeline-item"><strong>建议</strong><div>' + escapeHtml(legacy.result.decision.recommendation) + '</div></div>'
          : '<div class="empty">旧记录里没有额外结果。</div>';
    }

    async function loadReplay() {
      try {
        const response = await fetch('/api/sessions/${escapeHtml(sessionId)}/replay');
        const data = await response.json();
        if (!response.ok) {
          document.getElementById('replayMeta').innerHTML =
            '<div class="callout danger"><strong>无法加载回放。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          return;
        }

        if (data.source === 'legacy-workflow') {
          renderLegacyReplay(data.legacy);
          return;
        }

        document.getElementById('replayResumeHint').innerHTML = buildReplayResumePanel(data.session);
        document.getElementById('replayMeta').innerHTML =
          '<div class="meta-grid">' +
            '<div class="timeline-item"><strong>议题</strong><div>' + escapeHtml(data.session.topic) + '</div></div>' +
            '<div class="timeline-item"><strong>当前模式</strong><div>' + escapeHtml(modeLabel(data.session.currentMode)) + '</div></div>' +
            '<div class="timeline-item"><strong>最近活跃</strong><div>' + escapeHtml(formatTimestamp(data.session.lastActiveAt)) + '</div></div>' +
            '<div class="timeline-item"><strong>状态</strong><div>' + escapeHtml(formatSessionStatusLabel(data.session.status) || data.session.status) + '</div></div>' +
          '</div>';
        document.getElementById('replayTimeline').innerHTML = renderReplayEvents(data.events);
        document.getElementById('replayArtifacts').innerHTML = renderReplayArtifacts(data.artifacts);
      } catch (error) {
        document.getElementById('replayResumeHint').innerHTML =
          '<div class="callout danger"><strong>无法分析恢复动作。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
        document.getElementById('replayMeta').innerHTML =
          '<div class="callout danger"><strong>无法加载回放。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
        document.getElementById('replayTimeline').innerHTML =
          '<div class="callout danger"><strong>无法加载时间线。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
        document.getElementById('replayArtifacts').innerHTML =
          '<div class="callout danger"><strong>无法加载定稿产物。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadReplay();
  </script>
`);

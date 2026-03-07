# Phase 4A: Deferred Items

This document tracks features and capabilities that are intentionally NOT implemented in Phase 4A to maintain focus on the minimal CLI composition layer.

## Deferred to Phase 4B (Web UI)

- `apps/web` implementation
- Web-based UI for workflow execution
- Real-time progress streaming via SSE/WebSocket
- Interactive challenge/decision sessions
- Visual artifact browser
- User authentication and multi-user support

## Deferred to Phase 5+ (Advanced Features)

### Full Planning System
- Issue Queue management system
- Requirement Unit tracking
- Clarification workflow
- Impact Summary generation
- Subject Migration (主语迁移)
- Stability scoring and tracking
- Automated planning orchestration

### Advanced Workflow Features
- Workflow templates and customization
- Conditional workflow branching
- Parallel step execution
- Workflow versioning
- Rollback and recovery mechanisms
- Workflow scheduling and automation

### Advanced Engine Features
- Multi-round challenge with user interaction
- Advanced convergence strategies
- Context builder for decision engine
- Parser extraction and validation
- Scheduler policy implementation
- Confidence scoring and tracking

### Infrastructure
- Database persistence (Supabase/PostgreSQL)
- Cloud deployment
- API rate limiting and quotas
- Monitoring and observability
- Performance optimization
- Caching strategies

## Why These Are Deferred

Phase 4A focuses on proving the three-engine pipeline works end-to-end with minimal composition. Adding these features now would:

1. Blur the CLI boundary (risk absorbing engine logic)
2. Delay validation of core architecture
3. Introduce complexity before basics are proven
4. Risk scope creep into "building the full product"

## Current Scope Boundaries

✅ **In Scope for Phase 4A:**
- Minimal CLI commands (init, challenge, decision, export, workflow)
- Basic workflow orchestration (sequential execution)
- Minimal execution metadata (step tracking, summary)
- File-based artifact persistence
- Deterministic fake provider for testing

❌ **Out of Scope for Phase 4A:**
- Interactive prompts and user input
- Real-time progress updates
- Advanced error recovery
- Workflow customization
- Planning system integration
- Web UI
- Database persistence
- Multi-user support

## Next Steps

After Phase 4A completion:
1. Validate that CLI successfully composes engines
2. Review deferred items and prioritize for Phase 4B/5
3. Decide which deferred items are essential vs. nice-to-have
4. Plan Phase 4B (Web UI composition layer)

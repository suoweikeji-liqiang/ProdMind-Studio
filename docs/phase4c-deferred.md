# Phase 4C: Deferred Items

## Overview

Items explicitly deferred from Phase 4C scope to maintain focus on minimal hardening.

## Authentication & Authorization

**Deferred to Phase 5+**
- User authentication system
- Role-based access control (RBAC)
- Multi-user collaboration
- Session management
- API key management

## Database Productization

**Deferred to Phase 5+**
- PostgreSQL/MySQL integration
- Database migrations
- Connection pooling
- Query optimization
- Transaction management
- Database-backed persistence (currently file-based)

## Advanced Observability

**Deferred to Phase 5+**
- Real-time metrics dashboard
- Distributed tracing (OpenTelemetry)
- Log aggregation (ELK, Datadog)
- Alerting and notifications
- Performance profiling
- Resource utilization tracking

## Advanced Recovery

**Deferred to Phase 5+**
- Automatic retry with exponential backoff
- Partial phase checkpointing
- Distributed transaction recovery
- Workflow pause/resume
- Workflow cancellation

## UI/UX Enhancements

**Deferred to Phase 5+**
- Planning OS UI
- Mobile app / PWA
- Large UI redesign
- Real-time progress streaming
- Interactive workflow editor

## Testing & Validation

**Deferred to Phase 5+**
- Comprehensive provider integration tests
- Multi-provider validation
- Performance benchmarking
- Load testing
- Cost tracking

## Infrastructure

**Deferred to Phase 5+**
- Container orchestration
- Auto-scaling
- Load balancing
- CDN integration
- Multi-region deployment

## Rationale

Phase 4C focused on minimal hardening:
- Persistence (file-based, not DB)
- Recovery (manual retry, not automatic)
- History (basic list/show, not complex queries)
- Observability (timing + errors, not full metrics)
- Smoke testing (opt-in, not comprehensive)

This keeps the system simple, maintainable, and ready for Phase 5 feature expansion.

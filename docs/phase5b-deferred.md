# Phase 5B: Deferred Items

## Overview

This document lists items identified during Phase 5B that are deferred to future phases. These are NOT bugs or missing requirements - they are intentional scope limitations to keep Phase 5B focused on minimal observability foundation.

## Deferred Observability Features

### External Platform Integration
**Deferred to:** Phase 6+

- Integration with Datadog, Honeycomb, New Relic
- OpenTelemetry exporter
- Prometheus metrics endpoint
- StatsD integration
- CloudWatch integration

**Rationale:** Phase 5B focuses on internal observability. External platforms require additional dependencies, configuration complexity, and operational overhead.

### Distributed Tracing
**Deferred to:** Phase 6+

- Span propagation across services
- Trace sampling strategies
- Distributed context propagation
- Cross-service correlation
- Trace visualization

**Rationale:** Current system is single-process. Distributed tracing adds complexity without immediate value.

### Advanced Metrics
**Deferred to:** Phase 6+

- Percentile calculations (p50, p95, p99)
- Histogram distributions
- Time-series data with retention
- Custom metric definitions
- Metric aggregation windows
- Metric cardinality limits

**Rationale:** Basic counters and averages sufficient for current needs. Advanced metrics require more complex storage and computation.

### Event Persistence
**Deferred to:** Phase 6+

- Long-term event storage
- Event replay capabilities
- Event archival and retention policies
- Event query API
- Event filtering and search

**Rationale:** In-memory events sufficient for current diagnostic needs. Persistence adds storage and query complexity.

### Alerting and Anomaly Detection
**Deferred to:** Phase 6+

- Threshold-based alerting
- Anomaly detection algorithms
- Alert routing and escalation
- Alert suppression and grouping
- SLO/SLI tracking

**Rationale:** Manual monitoring sufficient for internal pilot. Alerting requires notification infrastructure and on-call processes.

### Real-Time Dashboards
**Deferred to:** Phase 6+

- Live metrics visualization
- Interactive charts and graphs
- Custom dashboard builder
- Dashboard sharing and templates
- Mobile dashboard support

**Rationale:** CLI summary sufficient for current needs. Dashboards require heavy UI development and real-time data infrastructure.

### Event Sampling
**Deferred to:** Phase 6+

- Probabilistic sampling
- Adaptive sampling based on load
- Head-based and tail-based sampling
- Sample rate configuration

**Rationale:** Current event volume low enough for full collection. Sampling adds complexity without immediate benefit.

### Structured Logging Integration
**Deferred to:** Phase 6+

- Integration with Winston, Pino, Bunyan
- Log level configuration
- Log rotation and archival
- Log shipping to external systems

**Rationale:** Observability events serve diagnostic needs. Full logging framework adds dependency weight.

## Deferred Correlation Features

### AsyncLocalStorage
**Deferred to:** Phase 6+

- Automatic context propagation via AsyncLocalStorage
- No manual context passing required
- Works across async boundaries

**Rationale:** Manual context passing sufficient and explicit. AsyncLocalStorage adds Node.js-specific dependency.

### Baggage Propagation
**Deferred to:** Phase 6+

- Arbitrary key-value pairs in correlation context
- Baggage propagation across boundaries
- Baggage size limits

**Rationale:** Current correlation fields (runId, phaseId, stepId) sufficient for tracing needs.

## Deferred Failure Diagnosis Features

### Root Cause Analysis
**Deferred to:** Phase 6+

- Automated root cause detection
- Failure pattern recognition
- Correlation with historical failures
- Suggested remediation actions

**Rationale:** Manual diagnosis sufficient for current scale. Automated analysis requires ML/heuristics.

### Error Aggregation
**Deferred to:** Phase 6+

- Group similar errors together
- Error frequency tracking
- Error trend analysis
- Error impact assessment

**Rationale:** Current error volume low. Aggregation adds storage and analysis complexity.

### Failure Replay
**Deferred to:** Phase 6+

- Capture full execution context at failure
- Replay failed execution for debugging
- Time-travel debugging

**Rationale:** Manual retry sufficient. Replay requires extensive state capture and replay infrastructure.

## Deferred Metrics Features

### Metrics Persistence
**Deferred to:** Phase 6+

- Store metrics to disk/database
- Metrics retention policies
- Historical metrics queries

**Rationale:** Session-scoped metrics sufficient. Persistence adds storage complexity.

### Metrics Export
**Deferred to:** Phase 6+

- Export to CSV, JSON
- Metrics API endpoints
- Metrics streaming

**Rationale:** CLI display sufficient. Export adds API surface and format handling.

### Custom Metrics
**Deferred to:** Phase 6+

- User-defined metric types
- Custom aggregation functions
- Metric tags and dimensions

**Rationale:** Built-in metrics cover current needs. Custom metrics add configuration complexity.

## Non-Phase-5 Items (Defer to Phase 6+)

These were never in scope for Phase 5:

### Authentication and Authorization
- User authentication
- Role-based access control
- API key management
- Session management

### Multi-User Collaboration
- Concurrent workflow execution
- Workspace sharing
- User activity tracking
- Conflict resolution

### Heavy Productization
- SaaS deployment
- Multi-tenancy
- Billing and metering
- Enterprise features

---

**Status**: Phase 5B complete - minimal observability foundation without platform expansion.

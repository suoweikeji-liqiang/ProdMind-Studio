# Phase 4C: Observability Standards

## Overview

Minimal observability for workflow execution tracking without heavy monitoring infrastructure.

## Observability Data

### Workflow Level
- **runId**: Unique identifier
- **status**: running | completed | failed
- **startedAt**: ISO timestamp
- **completedAt**: ISO timestamp (if finished)
- **totalDuration**: Calculated from start/complete timestamps
- **error**: Error message (if failed)

### Phase Level
- **phase**: challenge | decision | asset
- **status**: pending | running | completed | failed
- **startedAt**: ISO timestamp
- **completedAt**: ISO timestamp
- **durationMs**: Phase execution time in milliseconds
- **retryCount**: Number of retry attempts
- **error**: Phase-specific error message

## Data Collection

**Automatic Collection**
- All timing data collected automatically
- Status transitions tracked in real-time
- Errors captured with full context

**Storage**
- Persisted in `.prodmind/history/{runId}/run.json`
- Queryable via history store API
- No external monitoring service required

## Access Patterns

**CLI**
```bash
prodmind-studio history list              # View all runs
prodmind-studio history show <runId>      # View run details
```

**Web API**
```
GET /workflow/history                     # List runs
GET /workflow/history/:runId              # Get run details
```

## Metrics Available

- Workflow success rate (completed / total)
- Average phase duration
- Failure distribution by phase
- Retry frequency

## Deferred

- Real-time metrics dashboard
- Distributed tracing (OpenTelemetry)
- Log aggregation (ELK, Datadog)
- Alerting and notifications
- Performance profiling
- Resource utilization tracking

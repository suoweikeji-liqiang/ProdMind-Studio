# Phase 4B: Deferred Items

## Document Purpose
This document explicitly lists features and capabilities that are OUT OF SCOPE for Phase 4B to prevent scope creep and maintain the "thin Web composition layer" principle.

## Deferred to Phase 4C or Later

### Authentication & Authorization
- User login/logout
- Session management
- Password reset flows
- OAuth integration
- Role-based access control (RBAC)
- API key management

### Multi-User Collaboration
- Real-time collaboration features
- User presence indicators
- Shared workspace management
- Conflict resolution for concurrent edits
- Team management UI

### Database & Persistence
- Production database integration (PostgreSQL, MySQL, etc.)
- Database-backed session storage
- User data persistence
- Workflow history persistence beyond in-memory
- Database migrations and schema management

### Advanced State Management
- Redux, Zustand, or other state management libraries
- Complex client-side state synchronization
- Optimistic UI updates
- Offline support and sync

### Planning System UI
- Full Clarification system UI
- Issue Queue management interface
- Requirement Unit tracking UI
- Subject Migration workflow UI
- Planning OS complete product interface

### Advanced Workflow Features
- Workflow templates
- Custom workflow configuration UI
- Workflow branching and merging
- Workflow versioning
- Workflow scheduling and automation

### Real-Time Features
- WebSocket-based real-time updates
- Server-Sent Events (SSE) streaming
- Live progress streaming (beyond polling)
- Real-time notifications

### Advanced UI Components
- Rich text editors
- Drag-and-drop interfaces
- Complex data visualization (charts, graphs)
- Advanced filtering and search
- Keyboard shortcuts system

### Export & Integration
- PDF export
- Multiple export formats
- Third-party integrations (Slack, GitHub, etc.)
- Webhook support
- API documentation UI

### Analytics & Monitoring
- User analytics
- Workflow performance metrics
- Error tracking and monitoring
- Usage dashboards
- Audit logs

### Advanced Asset Management
- Asset versioning UI
- Asset comparison tools
- Asset search and filtering
- Asset tagging and categorization
- Asset templates

### Mobile & Responsive
- Native mobile apps
- Progressive Web App (PWA) features
- Advanced mobile-specific UI
- Touch gesture support

## What Phase 4B DOES Include

### Minimal Viable Web Interface
- Landing page
- Workflow execution page
- Results display page
- Basic navigation

### Thin Workflow Orchestration
- Trigger challenge → decision → asset pipeline
- Stage-level progress feedback
- Basic error handling

### Structured Result Display
- Challenge summary display
- Decision summary display
- Asset output display
- Status indicators

### In-Memory State Only
- Workflow status tracking (in-memory Map)
- No database persistence
- No user sessions

## Rationale for Deferral

### Keep Web as Composition Layer
Phase 4B focuses on proving the Web can orchestrate engines without absorbing their logic. Adding auth, multi-user, or heavy state management would:
- Blur the boundary between composition and business logic
- Increase complexity and maintenance burden
- Delay validation of the core architecture

### Validate Architecture First
Before building product features, we need to validate:
- Engine boundaries are clean
- Contracts are stable
- Composition pattern works
- Quality gates hold

### Incremental Complexity
Phase 4C+ can add product features incrementally after the thin layer is proven stable.

## Decision Criteria for Future Features

Before adding a feature to Web, ask:
1. Does this belong in an engine package instead?
2. Does this require Web to understand engine business logic?
3. Can this be added without breaking the thin composition principle?
4. Is the core architecture validated enough to support this?

If any answer is "yes" to #1 or #2, or "no" to #3 or #4, defer the feature.

# OpenCap Stack Architecture Documentation

This directory contains comprehensive architecture documentation for the OpenCap Stack platform's continuous bidirectional data synchronization system.

## Documents

### 1. [Continuous Sync Design](./continuous-sync-design.md)
**Purpose:** Comprehensive architectural design for MongoDB ↔ ZeroDB synchronization

**Contents:**
- Executive Summary & Key Decisions
- Requirements Analysis (Functional & Non-Functional)
- System Architecture & Component Design
- Data Flow Diagrams
- Conflict Resolution Strategy
- Error Handling & Retry Mechanisms
- Monitoring & Observability
- Technology Stack
- Implementation Roadmap (10 weeks)
- Risk Assessment

**Target Audience:** System Architects, Tech Leads, Senior Developers

### 2. [Sync Implementation Guide](./sync-implementation-guide.md)
**Purpose:** Practical implementation guide with code templates

**Contents:**
- Quick Start Guide
- Component Code Templates (Queue, Listeners, Workers)
- Integration Patterns with Existing Systems
- Testing Strategy & Examples
- Deployment Checklist

**Target Audience:** Developers, DevOps Engineers

## Quick Reference

### Architecture Overview

```
MongoDB (Source 1) ←→ Change Stream Listener → Sync Queue → Worker Pool → ZeroDB (Source 2)
                                                    ↑             ↓
ZeroDB (Source 2)  ←→ ZeroDB Poller           ← Sync Queue ← Conflict Resolver
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Sync Orchestrator | `services/syncOrchestrator.js` | Coordinate all sync components |
| Change Stream Listener | `services/syncChangeStreamListener.js` | Capture MongoDB changes |
| ZeroDB Poller | `services/syncZeroDBPoller.js` | Detect ZeroDB changes |
| Sync Queue | `services/syncQueue.js` | Event queuing with retry/DLQ |
| Worker Pool | `services/syncWorkerPool.js` | Process sync events |
| Conflict Resolver | `services/syncConflictResolver.js` | Resolve data conflicts |

### Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 3.1 Foundation | Week 1-2 | Queue, Worker Pool, Config |
| 3.2 Change Detection | Week 3-4 | Change Streams, Poller |
| 3.3 Conflict Resolution | Week 5 | Conflict Resolver |
| 3.4 Error Handling | Week 6 | Retry, DLQ, Circuit Breaker |
| 3.5 Orchestration | Week 7 | Integration, E2E Tests |
| 3.6 Monitoring | Week 8 | Metrics, Health Checks |
| 3.7 Production | Week 9-10 | Testing, Deployment |

## Getting Started

### Prerequisites
- MongoDB with Change Streams support (replica set)
- ZeroDB API access and credentials
- Node.js 18+ environment
- Understanding of event-driven architectures

### Initial Setup

1. **Review Architecture Documents**
   ```bash
   # Read design document first
   open docs/architecture/continuous-sync-design.md

   # Then review implementation guide
   open docs/architecture/sync-implementation-guide.md
   ```

2. **Configure Environment**
   ```bash
   # Add to .env
   ENABLE_SYNC=false  # Start disabled
   SYNC_MODE=bidirectional
   SYNC_WORKERS=4
   ZERODB_POLL_INTERVAL=2000
   ```

3. **Run Validation**
   ```bash
   # Verify MongoDB replica set is configured
   node scripts/validateMongoReplicaSet.js

   # Verify ZeroDB connectivity
   node scripts/validateZeroDBConnection.js
   ```

### Development Workflow

1. **Implement Component** (following templates in implementation guide)
2. **Write Unit Tests** (minimum 80% coverage)
3. **Write Integration Tests** (component interactions)
4. **Manual Testing** (use disabled sync flag initially)
5. **Code Review** (architecture compliance check)
6. **Merge & Deploy**

## Architecture Principles

### 1. Event-Driven
All synchronization is event-driven with asynchronous processing to minimize blocking operations.

### 2. Idempotency
Every sync operation must be idempotent to handle duplicate events and retries safely.

### 3. Resilience
Multiple layers of error handling: retry queues, dead letter queues, circuit breakers.

### 4. Observability
Comprehensive metrics, structured logging, and health checks at every layer.

### 5. Modularity
Clear separation of concerns with well-defined interfaces between components.

## Key Design Decisions

### Change Detection
- **MongoDB:** Change Streams (native, real-time, resume token support)
- **ZeroDB:** Polling with timestamp tracking (2-second interval)
- **Rationale:** MongoDB has native change stream support; ZeroDB requires polling

### Conflict Resolution
- **Strategy:** Last-Write-Wins (LWW) based on `updatedAt` timestamp
- **Audit:** All conflicts logged for review
- **Custom:** Support for per-model custom resolvers
- **Rationale:** Simple, predictable, works for most use cases

### Queue Architecture
- **Type:** In-memory with Redis fallback option
- **Priority:** DELETE (high), UPDATE (medium), INSERT (low)
- **Retry:** Exponential backoff with max 5 retries
- **Rationale:** Low latency for common case, reliable for production

### Error Handling
- **Transient Errors:** Automatic retry with exponential backoff
- **Permanent Errors:** Move to Dead Letter Queue (DLQ)
- **Circuit Breaker:** Prevent cascading failures
- **Rationale:** Balance between automatic recovery and manual intervention

## Metrics & SLOs

### Service Level Objectives (SLOs)

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Sync Latency (p95) | < 500ms | < 1000ms | > 2000ms |
| Throughput | > 1000 ops/s | > 500 ops/s | < 100 ops/s |
| Error Rate | < 0.1% | < 1% | > 5% |
| Availability | 99.9% | 99.5% | < 99% |

### Key Metrics to Monitor

1. **Sync Latency** - Time from change detection to successful sync
2. **Queue Depth** - Number of events waiting to be processed
3. **DLQ Size** - Events that failed after all retries
4. **Error Rate** - Percentage of failed sync operations
5. **Conflict Rate** - Percentage of operations requiring conflict resolution
6. **Worker Utilization** - Percentage of workers actively processing

## Testing Strategy

### Unit Tests
- Individual component logic
- Mock external dependencies
- Edge cases and error conditions
- Target: 80%+ coverage

### Integration Tests
- Component interactions
- Database operations
- API calls
- Real dependencies in test environment

### End-to-End Tests
- Complete sync flow: MongoDB → ZeroDB
- Reverse sync: ZeroDB → MongoDB
- Conflict resolution scenarios
- Error handling and recovery

### Performance Tests
- Load testing (1000+ ops/s)
- Stress testing (queue overflow)
- Latency under load
- Resource utilization

## Troubleshooting

### Common Issues

#### High Sync Latency
- **Cause:** Queue backlog or slow database responses
- **Solution:** Scale workers, check database performance, verify network

#### DLQ Accumulation
- **Cause:** Data validation errors, schema mismatches
- **Solution:** Review DLQ entries, fix data/schema issues, replay events

#### Change Stream Failures
- **Cause:** MongoDB connection issues, replica set problems
- **Solution:** Check resume tokens, verify replica set health, restart listener

#### Infinite Sync Loops
- **Cause:** Missing sync metadata in operations
- **Solution:** Verify `_syncMetadata.source` is set correctly

## References

### External Documentation
- [MongoDB Change Streams](https://docs.mongodb.com/manual/changeStreams/)
- [ZeroDB API Documentation](https://docs.zerodb.io/)
- [Event-Driven Architecture Patterns](https://martinfowler.com/articles/201701-event-driven.html)

### Internal Documentation
- [Database Schema Documentation](../DataModels.md)
- [Monitoring Guide](../monitoring/README.md)
- [Deployment Runbook](../operations/deployment-runbook.md)

## Contributing

When updating this architecture:

1. **Propose Changes** - Create design proposal document
2. **Review Process** - Architecture review with tech lead
3. **Update Docs** - Update all affected documents
4. **Version Control** - Document version and change history
5. **Communicate** - Notify team of architectural changes

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | System Architect | Initial architecture documentation |

## Contact

For questions or clarifications about this architecture:
- **Architecture Reviews:** Schedule with Tech Lead
- **Implementation Questions:** Engineering team channel
- **Production Issues:** On-call engineer

---

**Last Updated:** 2026-02-02
**Document Status:** Approved for Implementation
**Related Issues:** GitHub Issue #14 (Phase 3: Continuous Sync)

# Production Standards & Quality Assurance Guidelines

> Mandatory rule for all current and future implementations in DukaPos.

## Core Rules

1. **Production-Grade Only**:
   - Never inject mock demo data, demo seeders, or artificial test fallbacks into production views.
   - All data operations must target local IndexedDB (`db`) or central PostgreSQL (`cloudDb`/`server.js`).

2. **Persistence & Data Integrity**:
   - Every creation, modification, or deletion must persist to local storage (Dexie) and sync to central PostgreSQL via the sync engines (`productionSyncEngine`, `stockLedgerSyncEngine`, `offlineSyncWorker`).
   - Deletions must emit tombstones (`deletedAt`/`deleted_at`) and broadcast cross-tab events via `BroadcastChannel`.

3. **Performance & Memoization**:
   - Array lookups inside render paths must use `useMemo` map caches (`Map<id, Item>`) for O(1) constant-time lookups rather than `.find()` loops over large arrays.
   - Heavy data filtering, KPI calculations, and alert lists must be memoized at component level.

4. **Production Developer & System Controls**:
   - System controls (Release Center, Persistence Auditor, Production Readiness, Sync Dashboard) must run real automated diagnostics against live database tables and health probes.
   - Never show dummy progress indicators or hardcoded success status for system controls.

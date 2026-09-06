# OlogyCrew Customers Release 1 — Phase 1 Foundation Report

**Status:** Complete and disabled by default  
**Production UI exposed:** No  
**Projection or backfill executed:** No  
**Managed jobs scheduled:** No  
**Provider relationship messaging enabled:** No

## Delivered Foundation

The approved **Customers** domain contract is implemented in `shared/crm.ts`. It defines the lifecycle stages, append-only event vocabulary, entity/event pairing, safe metadata schemas, task and draft states, deterministic rule keys, provider capability keys, and six private rollout controls. These names follow the approved architecture, provider flows, and Release 1 PRD.

The authoritative provider entitlement catalog now includes the approved Customers capabilities. Starter retains read-only customer history; Pro adds relationship tools, notes, follow-ups, and provider-approved in-app messaging; Business adds saved segments, retention analytics, and automation controls. Access continues to resolve through the existing lifecycle-aware subscription model, including trial, grace, scheduled cancellation, suspension, and administrative grant behavior.

## Additive Data Model

Migration `0061_bouncy_kang.sql` adds the following tables without changing existing transaction authority:

| Table | Purpose |
|---|---|
| `crm_contacts` | Provider-scoped relationship projection |
| `crm_activity_events` | Append-only safe activity timeline |
| `crm_contact_notes` | Provider-private notes |
| `crm_tasks` | Follow-up work queue |
| `crm_contact_stage_history` | Derived and manual stage history |
| `crm_contact_preferences` | Relationship-level communication preferences |
| `crm_message_drafts` | Provider-reviewable in-app message drafts |
| `crm_automation_rules` | Allow-listed global or provider controls |
| `crm_automation_runs` | Idempotent rule execution history |
| `crm_saved_segments` | Business-only saved filters |
| `crm_operational_state` | Private rollout, pilot, and managed-job state |

The migration also adds `relationshipMessageEnabled` to `notification_preferences`, defaulting to false. The database migration was verified after execution; every table and index exists, and all Customers tables remain empty.

## Repository and Policy Safety

All repositories require a server-derived provider ID and apply a provider predicate to reads and writes. Cross-provider contact, task, rule, draft, and automation-run references are rejected. Event keys and task/draft/run dedupe keys are provider scoped. Contact and event uniqueness make repeated projection attempts idempotent without collapsing work across tenants.

Pure policies now cover relationship eligibility, demo/test exclusion, stage precedence, archive restoration, captured value, consent, and allow-listed task/draft recommendations. Captured value counts net captured payments plus registered-customer standalone paid invoices while excluding failed payments, booking-linked invoice duplicates, receipts, and credit notes. Message event metadata cannot contain message text.

## Privacy and Deletion

Account deletion removes every Customers relationship record for a deleted customer and every provider-owned rule or segment for a deleted provider. The global test teardown also removes Customers records only for unmistakable reserved test identities and preserves the previously hardened legitimate-account boundary. Operational-state actor references are cleared rather than deleting shared rollout configuration.

## Validation Evidence

| Validation | Result |
|---|---|
| Focused and adjacent regression set | 9 files passed; 65 tests passed |
| TypeScript | Zero errors |
| Production build | Successful |
| Migration integrity | Additive only; no DROP, DELETE, TRUNCATE, or RENAME statements |
| Database post-test state | Zero contacts, events, notes, tasks, histories, preferences, drafts, rules, runs, segments, and operational settings |
| Public exposure | No `/provider/customers` route, public Customers router, navigation item, or message-send operation |
| Background activity | No projection, backfill, repair, recommendation, or time-rule job registered |

Vitest continues to report the project’s known process-close timeout after tests and teardown have completed successfully. It does not represent a failed assertion or incomplete cleanup.

## Phase 2 Approval Boundary

The next phase should add the source-event projection service and owner-controlled dry-run/backfill tooling behind the private flags created here. It must not expose the provider Customers interface or enable messaging until projection counts, exclusions, idempotency, source-to-projection lag, and rebuild behavior have been validated against the approved private pilot.

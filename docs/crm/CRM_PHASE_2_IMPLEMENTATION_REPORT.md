# OlogyCrew Customers Release 1 — Phase 2 Projection Report

**Status:** Complete and disabled by default  
**Customers UI exposed:** No  
**Projection rows created:** No  
**Managed jobs scheduled:** No  
**Relationship messaging enabled:** No

## Delivered Projection Layer

Phase 2 adds an idempotent Customers projector over OlogyCrew's authoritative booking, quote, payment, invoice, eligible-message, and booking-linked review records. It derives one provider/customer relationship, safe activity events, lifecycle stage, interaction dates, booking totals, next booking, and captured relationship value without replacing or mutating any source record.

Every live source hook is non-blocking. The originating booking, quote, payment, refund, invoice, message, or review action remains authoritative and succeeds independently if Customers projection is disabled or fails. Failures are written to private operational state for owner review and bounded repair.

## Source Boundaries

| Source | Customers behavior |
|---|---|
| Standard, multi-day, and recurring bookings | Project after the authoritative parent and required sessions exist |
| Booking status and cancellation | Refresh stage and append the matching lifecycle event after the source update |
| Quote request, response, acceptance, decline, and conversion | Project one provider-scoped relationship per quote; bulk quote requests remain isolated by provider |
| Stripe booking payments and refunds | Persist one authoritative PaymentIntent-backed payment row, then project captured, failed, or refunded state |
| Registered-customer invoices | Project lifecycle events; external-recipient invoices remain outside Release 1 |
| Messages | Project metadata only for an already-qualified relationship; direct messages never create contacts and message bodies are excluded |
| Booking-linked reviews and provider responses | Append provenance-safe review events after the authoritative review write |

## Owner Operations

The owner-only `crmOperations` API provides private status, dry run, bounded pilot backfill, reconciliation, repair, and projection-only rebuild controls. Destructive or write operations require explicit confirmation literals. Projection writes and repair require a configured private pilot provider. The four customer-facing flags—read UI, provider writes, recommendations, and draft sending—are forced off in Phase 2.

Backfill uses a provider/customer composite cursor so a bounded run can resume inside a provider without skipping relationships. A dry run records private metrics but cannot advance the live backfill cursor. Rebuild deletes and recreates only source-derived events and stage history; provider notes, tasks, preferences, drafts, manual stages, rules, runs, and saved segments are preserved.

## Financial Integrity Correction

Phase 2 identified that Stripe booking success and failure events were not guaranteed to create or update the authoritative `payments` row used by captured-value reporting. Checkout now records payment type and original amount in Stripe metadata, and webhooks upsert payment state idempotently by a unique PaymentIntent identifier before projection. State transitions are monotonic so delayed failure or success events cannot regress captured or refunded payments. The existing 60/40 destination-transfer and partner accounting behavior is unchanged.

## Non-Writing Source Assessment

An owner-equivalent non-writing dry run evaluated current source records without enabling flags or creating Customers rows.

| Metric | Result |
|---|---:|
| Providers inspected | 16 |
| Candidate provider/customer relationships | 8 |
| Eligible relationships | 5 |
| Excluded relationships | 3 |
| Official demo exclusions | 1 |
| Unavailable-provider exclusions | 2 |
| Projection rows written | 0 |
| Failures | 0 |

The dry-run metrics remain in private operational state as evidence. The accidental dry-run cursor and run identifier were removed, and the code now prevents dry runs from mutating the live resumable cursor.

## Validation Evidence

| Validation | Result |
|---|---|
| Focused and adjacent regression set | 34 files passed; 369 tests passed |
| TypeScript | Zero errors |
| Production build | Successful |
| Diff integrity | Passed |
| Customers data after tests | Zero contacts, events, notes, tasks, histories, preferences, drafts, rules, runs, or segments |
| Private state | One intentional dry-run metrics record; no pilot, rollout flag, cursor, schedule, or failed-operation state |
| Public exposure | No Customers route, UI, navigation item, public rollout configuration, or send operation |

Database-backed tests now execute file-sequentially so one suite's reserved-identity cleanup cannot delete another suite's active fixtures. Legacy quote, review, and Stripe Connect suites mock external notifications and no longer send real email, SMS, or push messages during validation. Vitest retains the known process-close timeout after assertions and cleanup complete successfully.

## Phase 3 Approval Boundary

The next phase should expose a read-only `/provider/customers` pilot for a specifically approved provider, powered only by this projection. Before enabling that pilot, the owner must select the provider ID. Provider-authored notes, tasks, filters, drafts, and message sending must remain disabled until their later approved rollout stages.

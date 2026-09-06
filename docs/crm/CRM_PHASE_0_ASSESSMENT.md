# OlogyCrew Customers

## Phase 0 Codebase and Integration Assessment

**Status:** Complete assessment; awaiting owner approval  
**Scope:** Assessment only  
**Production behavior changed:** No  
**Database schema changed:** No  
**Authoritative specifications:** [Technical Architecture](./CRM_TECHNICAL_ARCHITECTURE.md), [Provider Flows and Wireframes](./CRM_PROVIDER_FLOWS_AND_WIREFRAMES.md), and [Release 1 PRD](./CRM_RELEASE_1_PRD.md)

> **Implementation rule:** Customers must be an additive, provider-owned projection over OlogyCrew activity. Bookings, quotes, services, messages, payments, invoices, reviews, subscriptions, notifications, authentication, provider verification, and public discovery remain authoritative.

## 1. Executive Assessment

OlogyCrew is ready to begin the approved Customers implementation through a controlled, additive rollout. The codebase already has the identity, provider ownership, transactional records, lifecycle-aware entitlements, secure source-detail routes, notifications, audit logging, role switching, and managed scheduled-handler foundation needed for Release 1. The current provider Overview also has reusable attention and customer-count primitives.

The Customers feature itself does **not** exist yet. There is no `/provider/customers` route, CRM router, relationship projection, immutable relationship timeline, private CRM notes, follow-up tasks, message drafts, deterministic rule engine, CRM-specific entitlements, or CRM operational health view.

Implementation should proceed after the owner resolves six specification-to-code decisions documented in Section 8. The highest-risk issue is conversation eligibility: the current direct-message mutation permits an authenticated user to message a recipient ID without proving a booking, quote, invoice, or provider/customer relationship. A naive message-based backfill would therefore create invalid provider-owned contacts. The second material issue is consent: OlogyCrew has a global `marketingEmail` preference but no global preference for provider-initiated in-app relationship outreach.

| Phase 0 conclusion | Assessment |
|---|---|
| General feasibility | **Ready with approval conditions** |
| Required architecture | Additive relationship projection; no replacement of transactional domains |
| Initial data volume | Small and operationally low-risk: 21 users, 15 providers, 9 bookings, 6 booking-derived provider/customer pairs, no quote rows, 4 invoices, 2 payments, 1 message, and no review rows at audit time |
| Existing inactive supply | 2 inactive or deleted providers; must be excluded from backfill and internal pilot counts |
| Existing external invoices | 2 invoices use `customerId = 0`; must be excluded because manual/external contacts are out of Release 1 |
| Core migration posture | Add tables first, deploy with all Customers flags off, dry-run backfill, then enable shadow projection |
| Rollback posture | Disable flags, pause managed jobs, and stop event projection; never roll back by deleting source transactions or dropping CRM tables |

## 2. Current Platform Inventory

### 2.1 Provider workspace and navigation

The approved provider Overview is implemented in [`ProviderWorkspaceOverview.tsx`](../../client/src/pages/ProviderWorkspaceOverview.tsx). It already exposes **Needs attention**, **Today**, **Quick actions**, and **Business pulse**. The Overview backend in [`providerOverviewRouter.ts`](../../server/providerOverviewRouter.ts) consolidates bookings, services, quotes, invoices, subscription access, collected revenue, and returning-customer counts.

The current Overview desktop navigation is `Overview → Bookings → Services → Calendar → Money → My Page → More`. Its mobile navigation is `Home → Bookings → Calendar → Money → More`. The separate provider dashboard still uses six local tabs: Bookings, Services, Schedule, Finances, My Page, and More. No Customers destination exists in either shell.

The exact approved Customers navigation change is therefore additive:

| Surface | Current | Required |
|---|---|---|
| Overview desktop sidebar | Overview, Bookings, Services, Calendar, Money, My Page, More | Insert **Customers** after Bookings |
| Overview mobile bar | Home, Bookings, Calendar, Money, More | Replace Calendar with **Customers**; Calendar remains in More and Block time |
| Provider dashboard mobile bar | Six local tab actions | Align to Home, Bookings, Customers, Money, More without removing the underlying Services, Schedule, My Page, or Settings views |
| Router | No Customers route | Add guarded `/provider/customers` and `/provider/customers/:contactId` routes |

### 2.2 Customer home

The approved need-first customer home is already implemented and should remain unchanged. [`customerHomeRouter.ts`](../../server/customerHomeRouter.ts) is a useful projection precedent: it joins authoritative bookings, quotes, services, providers, and reviews to derive actionable UI without creating a second transaction model. Its rebooking logic already excludes inactive providers and services and deep-links into existing booking flows.

Customers Release 1 should reuse this projection philosophy, but it must not modify the customer home, customer navigation, one-tap rebooking, or adaptive booking behavior.

### 2.3 Authentication and provider/customer view switching

Current custom authentication preserves selected plans, email verification, role selection, and optional 2FA. [`ViewModeContext.tsx`](../../client/src/contexts/ViewModeContext.tsx) automatically switches to provider mode for `/provider/` routes and persists provider/customer view choice. The new routes naturally fall under the existing `/provider/` prefix and should reuse `ProviderOnlyGuard`.

No authentication table, session flow, OAuth callback, 2FA flow, pending-plan field, or role enum should change for Customers Release 1.

### 2.4 Authoritative transactional sources

| Domain | Existing source and reusable behavior | Customers use |
|---|---|---|
| Provider ownership | `service_providers.userId`; protected provider lookups | Resolve `providerId` from the authenticated user on every provider procedure |
| Services | `services`, provider categories, service activity flags | Display factual service context and deep-link to existing service records |
| Quotes | `quote_requests` with pending, quoted, accepted, declined, expired, and booked states | Lead and quote stage events; response and follow-up recommendations |
| Bookings | `bookings` with pending, confirmed, in-progress, completed, cancelled, no-show, and refunded states; `booking_sessions` for multi-day and recurring work | Booked/customer/repeat stages, next booking, completed work, cancellation and no-show suppression |
| Payments | `payments` with captured and refunded amounts | Captured booking value net of recorded refunds |
| Provider invoices | `invoices` with draft, sent, viewed, paid, overdue, and cancelled states | Invoice events and overdue tasks for registered OlogyCrew customers only |
| Messages | `messages` with participant authorization and optional `bookingId` | Metadata-only timeline events and existing conversation deep links |
| Reviews | One booking-linked review per completed booking | Factual review-received and provider-response events only |
| Notifications | In-app records, SSE updates, push delivery, and channel preferences | Provider task/recommendation notices; existing transaction notices remain unchanged |
| Analytics | Existing total-customer and returning-customer helpers | Reconcile backfill counts and seed aggregate adoption metrics |
| Entitlements | Shared lifecycle-aware provider resolver | Add explicit Customers feature keys and enforce them server-side |
| Audit | Existing immutable admin audit log | Record configuration, export if approved, repair, and elevated operational actions |

## 3. What Can Be Reused

The implementation should reuse these capabilities directly rather than rebuild them:

1. **Provider identity and tenant boundary.** Every CRM request should call the existing provider-by-user helper and never accept `providerId` from the browser.
2. **Source authorization.** Booking, quote, invoice, conversation, and review detail routes remain responsible for access to their records.
3. **Provider Overview aggregation.** Existing attention cards, customer counts, and returning-customer metrics can become Customers entry points once a contact projection exists.
4. **Customer-home projection conventions.** Current joins, active-provider checks, active-service checks, and rebook links are the closest proven pattern for safe derived UI.
5. **Lifecycle-aware subscriptions.** `resolveProviderEntitlement` and `providerHasFeature` already handle free, trialing, paid, cancelling, grace, suspended, paused, and cancelled access.
6. **Existing secure messaging record.** Approved relationship drafts should ultimately create one ordinary message, then link `sentMessageId` to that record. They should not create a parallel CRM conversation system.
7. **Notification infrastructure.** In-app/SSE provider notifications can alert providers to due tasks without exposing note bodies or duplicating transaction notifications.
8. **Platform settings repository.** Non-sensitive rollout-stage flags can reuse the existing key-value store, provided sensitive provider allowlists and scheduled-task identifiers are not exposed through its current public `getAll` procedure.
9. **Managed scheduled handlers.** The existing Heartbeat authentication and `/api/scheduled/*` mounting pattern can support bounded projection repair and daily time-based recommendations after deployment.
10. **Testing discipline.** Existing authorization, entitlement, clean-account cleanup, booking, quote, payment, notification, verification, and responsive test patterns can be extended.

## 4. What Must Be Added

### 4.1 Shared domain contract

Add [`shared/crm.ts`](../../shared/) with plain-language stages, event names, task states, task types, rule action types, entitlement feature keys, cursor schemas, safe event metadata schemas, and feature-flag keys. Pure stage, consent, and recommendation rules should be testable without a database.

### 4.2 Additive projection tables

The approved architecture requires these tables:

| Table | Purpose | Critical constraints |
|---|---|---|
| `crm_contacts` | One provider-owned relationship per existing OlogyCrew customer | Unique `(providerId, customerId)`; provider-first indexes; derived and manual stages stored separately |
| `crm_activity_events` | Append-only safe relationship timeline and replay cursor | Unique deterministic `eventKey`; no message body, authentication data, private booking note, card, bank, or evidence payload |
| `crm_contact_notes` | Provider-private notes | Provider scope repeated; 5,000-character limit; soft deletion; no normal admin read path |
| `crm_tasks` | Manual and deterministic follow-ups | Unique `dedupeKey`; authorized state transitions; no automatic urgent marketing task |
| `crm_contact_stage_history` | Immutable automatic/manual stage changes | Actor/source/reason/time; no update/delete product path |
| `crm_contact_preferences` | Relationship-level restrictions | May narrow global permission but never expand a global opt-out |
| `crm_message_drafts` | Editable provider-approved in-app drafts | Recheck authorization and preference at send time; link exactly one existing message |
| `crm_automation_rules` | Versioned allow-listed deterministic rule definitions | No executable code; non-transactional customer communication always requires approval |
| `crm_automation_runs` | Idempotent rule execution history | Unique dedupe key; links to one output task and optional draft |

Two implementation-support records are required to satisfy approved operational behavior but are not fully specified in the architecture document:

| Proposed addition | Why it is required | Approval status |
|---|---|---|
| `crm_saved_segments` | The PRD includes Business saved segments, but no table or API is defined | **Owner decision required** |
| `crm_system_jobs` or private equivalent | Managed repair/recommendation task UIDs, cursor, last success, last error, and pause state must be durable and must not be stored in publicly readable platform settings | **Owner decision required** |

No CRM table should copy customer names, email addresses, phone numbers, message bodies, provider verification evidence, payment credentials, or authentication fields. Provider-scoped contact search should join authorized `users` rows initially; add source-table indexes only after query measurements justify them.

### 4.3 Server modules

Add the approved typed repository and service boundaries:

```text
server/
  crmRouter.ts
  crm/
    contactService.ts
    eventService.ts
    stageResolver.ts
    recommendationEngine.ts
    consentPolicy.ts
    draftService.ts
    adminAnalytics.ts
    projectionRepair.ts
  db/crm/
    contacts.ts
    events.ts
    notes.ts
    tasks.ts
    drafts.ts
    preferences.ts
    rules.ts
    stageHistory.ts
```

`crmRouter.ts` should compose provider-protected procedures and resolve the provider from `ctx.user`. Unauthorized cross-provider contact IDs must return not found rather than reveal that another provider has a relationship.

### 4.4 Provider interface

Add the approved routes and page modules:

```text
client/src/pages/provider/
  CustomersHome.tsx
  CustomerDetail.tsx
  FollowUps.tsx
  CustomerActivity.tsx
```

The interface must use **Customers**, **Leads**, **Follow-ups**, and **Activity**. It must not display CRM terminology, a pipeline builder, manual contact importer, bulk campaign controls, AI autopilot, or a second booking/message/invoice implementation.

### 4.5 Managed background handlers

Add two deterministic managed handlers after the schema and projection services exist:

1. `/api/scheduled/crm-projection-repair` for bounded unprojected-event repair.
2. `/api/scheduled/crm-time-rules` for daily rebooking, quote expiry, and other time-based evaluations.

These handlers must authenticate as managed scheduled calls, process bounded cursor batches, be idempotent, return structured errors, and never send relationship messages. They must be deployed before their schedules are created. No `setInterval`, startup timer, or scheduled Manus/AI task should be used.

## 5. What Must Be Modified

### 5.1 Shared entitlements

Add server-enforced provider feature keys before any plan copy changes. The approved capability intent is:

| Feature | Starter | Pro | Business |
|---|---:|---:|---:|
| `customerHistory` | Yes | Yes | Yes |
| `crmNotes` | No | Yes | Yes |
| `crmFollowUps` | No | Yes | Yes |
| `crmDrafts` | No | Yes | Yes |
| `crmStageOverrides` | No | Yes | Yes |
| `crmSegments` | No | No | Yes |
| `crmRetentionAnalytics` | No | Basic | Full |
| `crmAutomationControls` | No | No | Yes |

The architecture’s proposed `crmCustomAutomations` key conflicts with the PRD exclusion of a custom automation builder. The safe Release 1 key is `crmAutomationControls`, meaning enable/disable platform rules and configure the approved inactivity window—not create arbitrary rules.

### 5.2 Source mutation hooks

Add best-effort, non-blocking event append calls after successful source writes in:

| Source | Required hook points |
|---|---|
| Quotes | Request created, provider quote sent, accepted, declined, expired, and linked to booking |
| Bookings | Created, confirmed, started, completed, cancelled, no-show, and refunded |
| Payments | Captured, failed, and refund confirmed by Stripe |
| Invoices | Created, sent, viewed, paid, overdue, and cancelled for registered customers |
| Messages | Sent and read metadata after relationship eligibility is established |
| Reviews | Booking-linked review created and provider response recorded |

Current writes are generally separate repository calls rather than shared transactions. Only the recent Terms workflow uses a database transaction. Customers should not require a broad rewrite of booking, quote, message, invoice, review, or Stripe flows. Where an existing source operation already uses a transaction, append the event atomically. Elsewhere, write the source first, append the CRM event in a guarded non-blocking call, record failure metrics, and rely on bounded repair scans.

Quote acceptance currently updates the quote, creates the booking, and links the quote through separate writes. CRM must record `quote.accepted` even if booking creation fails, and only record `quote.booked`/`booking.created` after the booking and linkage actually exist.

Invoice detail currently marks `sent` invoices as `viewed` inside a protected query. That transition must emit a repairable `invoice.viewed` event without making invoice viewing depend on CRM availability.

### 5.3 Navigation and approved Overview entry points

Modify only the relevant navigation arrays and links. Insert Customers after Bookings on desktop, replace Calendar with Customers on the provider mobile bar, retain Calendar under More and Block time, make the Overview Customers metric clickable, and direct relationship-aware attention/notification links to the correct contact once projection is available. The approved Overview content structure must remain unchanged.

### 5.4 Account deletion and test cleanup

Extend [`deleteUserAccount`](../../server/db/users.ts) and clean-account teardown for every CRM table. Required ordering is child records first, then contacts. Provider deletion must remove provider-owned notes, tasks, drafts, preferences, runs, events, stage history, and contacts. Customer deletion must remove or irreversibly anonymize that customer’s relationship projections while preserving only legally required, non-identifying source records under existing policy.

No test may create public supply, reviews, ratings, real charges, partner transfers, emails, SMS, push delivery, or marketing messages. Reserved hidden identities and verified teardown remain mandatory.

### 5.5 Admin operations

Add aggregate-only Customers health information to the current admin experience: adoption, contact counts, projection lag, unprocessed events, duplicate rejection, failed runs, task outcomes, and rule pause/retry controls. Private note bodies must not appear in admin queries, logs, analytics events, exports, notifications, or error payloads.

All administrators may view aggregate health if approved. Rule configuration, managed-job changes, and global retry actions should require `super_admin`; support and moderator roles should not receive private contact-level access.

## 6. What Must Remain Unchanged

The following are explicit regression boundaries:

- The approved provider Overview layout and its Needs attention, Today, Quick actions, and Business pulse hierarchy.
- The approved need-first customer home and one-tap rebooking behavior.
- Adaptive direct booking versus quote request routing.
- Booking, multi-day, recurring, availability, cancellation, refund, and status authorization rules.
- Quote authority and provider/customer response permissions.
- Existing message records, participant access checks, and conversation routes.
- Stripe Connect onboarding, payment collection gates, checkout, invoices, refunds, subscriptions, and the 60/40 partner transfer using `source_transaction`.
- Evidence-specific provider trust, private verification documents, booking-linked review provenance, and demo-provider trust suppression.
- Authentication, selected-plan persistence, role selection, provider/customer switching, optional 2FA, and account restoration behavior.
- Terms versioning and user notice workflow.
- Apple Sign In and Instagram publishing remain deferred.
- Public discovery, provider slugs, public service search, and active-provider boundaries.

CRM event or projection failure must never roll back, delay, duplicate, or alter any of these authoritative flows.

## 7. Exact Relationship Eligibility and Projection Rules

### 7.1 Safe initial eligibility

Create one contact only when all conditions are true:

1. The provider exists and is not deleted.
2. The customer user exists and is not deleted.
3. The provider/customer pair has at least one qualifying OlogyCrew source record.
4. The source belongs to the same provider and customer IDs.
5. The identity is not a reserved automated-test identity.
6. The provider is not an official demo provider unless explicitly enrolled in the internal-only pilot.

The unambiguous Release 1 sources are a quote request, booking, or registered-customer provider invoice. Invoices with `customerId = 0` are excluded.

### 7.2 Stage precedence

Use deterministic precedence rather than mutable pipeline state:

1. Manual `archived` override when no new inbound restoration is pending.
2. `dormant` when a prior completed relationship has no future booking and no qualifying interaction within the approved inactivity window.
3. `repeat_customer` for at least two completed bookings.
4. `customer` for at least one completed booking.
5. `booked` for an active pending, confirmed, or in-progress booking with no completed booking.
6. `quoted` for a current quoted or accepted-but-not-yet-booked quote.
7. `lead` for a pending quote or other approved inbound opportunity.

`refunded`, `cancelled`, and `no_show` states affect tasks and suppression but do not erase factual history. Captured lifetime value is stored in cents and is recalculated from captured booking payments net of recorded refunds plus paid provider-created invoices for registered customers, excluding generated receipts and credit notes so value is not counted twice.

## 8. Specification Conflicts and Owner Decisions

No production implementation should begin until these decisions are approved.

| ID | Conflict or missing dependency | Risk | Recommended Release 1 resolution |
|---|---|---|---|
| P0-01 | “Authorized conversation” is an eligible contact source, but current direct messaging accepts an authenticated `recipientId` without proving a provider/customer relationship | Arbitrary messages could create invalid provider-owned contacts | Project only booking-linked conversations or conversations where the pair already has a quote, booking, or registered invoice. Do not use standalone DMs as a primary source until messaging eligibility is separately strengthened. |
| P0-02 | The wireframe’s **Book** action requires an existing provider-assisted booking path, but no such provider flow exists | Building it now would expand Release 1 and duplicate booking logic | For Release 1, show **View booking** when a source booking exists and preserve customer-facing booking deep links. Defer provider-created bookings to a separately approved project. |
| P0-03 | Business saved segments are in the PRD, but no `crm_saved_segments` schema or API is defined | Implementations will diverge or silently omit an approved Business feature | Approve an additive saved-segment table containing provider scope, name, validated filter JSON, and timestamps. No contact membership copies; segments are saved queries. |
| P0-04 | Relationship export appears in the wireframe and authorization test language, but has no PRD capability row, entitlement key, schema, or API | Accidental data overexposure and packaging drift | Defer CRM export from Release 1 unless the owner explicitly approves a Business-only `crmExports` entitlement and scoped export endpoint. |
| P0-05 | `crmCustomAutomations` is proposed, while custom automation builders are explicitly out of scope | A feature key could promise functionality Release 1 must not provide | Use `crmAutomationControls` for Business enable/disable controls and approved inactivity settings only. |
| P0-06 | Global preferences include `marketingEmail`, but there is no global customer preference for provider-initiated in-app relationship messages | The promised global opt-out precedence cannot be enforced for the Release 1 send channel | Add a customer-facing relationship-messaging preference before enabling drafts. History, notes, tasks, and recommendations may pilot earlier; message sending remains off until consent behavior is approved and tested. |
| P0-07 | New inbound activity should restore an archived relationship and prompt review, but archive-state clearing is not fully defined | Contacts could remain hidden or lose provider intent silently | Clear the archive override on qualifying inbound activity, record immutable system stage history, restore list visibility, and create one deduplicated low-priority review task. |
| P0-08 | Managed task UIDs and pilot allowlists need durable private storage, but `platformSettings.getAll` currently exposes all keys publicly | Operational identifiers or provider IDs could leak | Add private CRM operational state or first add public/private classification to platform settings. Do not place job UIDs or pilot IDs in the current public key-value surface. |

## 9. Current Background-Execution Risk

OlogyCrew already has managed HTTP handlers for trial expiry and social publishing. It also starts booking reminders, review reminders, and credit expiration through in-process `setInterval`/`setTimeout` services when the server starts. Those legacy services are outside Customers scope and should not be rewritten during this release.

Customers must **not copy** that timer pattern. Autoscale instances may stop, restart, or run concurrently. Projection repair and time-based recommendations must use deployed, authenticated, idempotent managed HTTP jobs. No Manus task or AI run is necessary; the work is deterministic application code.

## 10. Migration and Backfill Risk Assessment

### 10.1 Proposed table order

Create tables in dependency order:

1. `crm_contacts`
2. `crm_automation_rules`
3. `crm_activity_events`
4. `crm_contact_stage_history`
5. `crm_contact_notes`
6. `crm_contact_preferences`
7. `crm_tasks`
8. `crm_message_drafts`
9. `crm_automation_runs`
10. `crm_saved_segments` and private system-job state only if approved

Use foreign keys for provider, customer, contact, author, assignee, rule, task, and sent-message ownership. Do not foreign-key generic source `entityId`; source records may be anonymized or removed by existing account-deletion policy while the event record is being cleaned up separately.

### 10.2 Backfill sequence

| Step | Action | Validation |
|---|---|---|
| 0 | Save a stable checkpoint and keep all Customers flags off | Existing regression suite remains passing |
| 1 | Apply additive schema only | Existing tables and row counts unchanged |
| 2 | Run a read-only dry-run projector | Report eligible, excluded, duplicate, demo/test, deleted, and external-invoice counts |
| 3 | Upsert contacts by `(providerId, customerId)` in bounded cursor batches | Rerun produces no new contacts |
| 4 | Append safe source events with deterministic keys | Rerun reports duplicate rejection, not duplicate rows |
| 5 | Recalculate stages and summaries | Sampled totals reconcile with bookings, quotes, payments, invoices, and provider analytics |
| 6 | Enable guarded live event append in shadow mode | Core source mutation success rate is unchanged; projection failures are observable |
| 7 | Deploy managed repair handlers, then create managed schedules | Job UIDs persisted privately; retry is idempotent |
| 8 | Enable owner/internal read-only UI | Tenant isolation and privacy tests pass before provider pilot |

At audit time the dataset is small, so performance risk is low. Correctness risk is more important than throughput. Backfill must still use bounded cursors and restartable checkpoints so the same code remains safe as the platform grows.

### 10.3 Backfill exclusions

Exclude:

- Deleted users and providers.
- Inactive providers unless explicitly included as a private internal test provider.
- Reserved automated-test identities.
- Official demo providers unless explicitly included in a non-public internal pilot.
- Invoices with `customerId = 0`.
- Standalone direct messages without another qualifying relationship source.
- Contact-form submissions, waitlist records, favorites, social posts, imported text, reviews without a completed booking, and any external/manual contact.

## 11. Feature Flags and Rollback Boundaries

Use independent server-side flags rather than one irreversible launch switch:

| Flag | Default | Purpose |
|---|---:|---|
| `customersProjectionWrites` | Off | Append and project new source events |
| `customersRepairJobs` | Off | Permit managed repair/time-rule processing |
| `customersReadUi` | Off | Expose read-only Customers routes to approved internal users |
| `customersProviderWrites` | Off | Enable notes, tasks, stage overrides, archives, and preferences |
| `customersRecommendations` | Off | Enable deterministic rule outputs |
| `customersDraftSending` | Off | Enable provider-approved message sending only after consent acceptance |

Rollback means turning flags off in reverse order, pausing managed jobs, and leaving additive rows in place for diagnosis. It must not delete CRM tables, undo source transactions, disconnect Stripe, alter bookings, remove messages, or change provider/public visibility.

## 12. Security and Privacy Controls

| Boundary | Required control |
|---|---|
| Provider tenant isolation | Resolve provider server-side; include `providerId` in every read and write predicate |
| Cross-provider probing | Return not found for unauthorized contact, event, task, note, draft, and preference IDs |
| Private notes | Dedicated repository/router; no normal admin endpoint; no content in logs, analytics, notifications, drafts, or exports |
| Timeline metadata | Allow-listed Zod schema per event type; no arbitrary JSON passthrough from clients |
| Draft sends | Explicit provider action, current relationship check, current consent check, entitlement check, and idempotency key |
| Customer deletion | Remove or irreversibly anonymize every customer-linked CRM row according to existing deletion policy |
| Provider deletion | Delete provider-owned CRM state before or with provider deactivation cleanup |
| Admin operations | Aggregate by default; global rule/retry controls restricted to `super_admin`; no private note access |
| Test safety | Hidden reserved identities, mocked communications and Stripe, no public supply or reviews, verified teardown |
| Observability | Log IDs, counts, event types, and error codes—not names, emails, note bodies, message bodies, or sensitive source content |

## 13. Implementation Sequence After Approval

| Stage | Deliverable | Exit gate |
|---|---|---|
| Phase 1 | Shared CRM constants, additive tables, repositories, pure stage/consent/rule logic, private flags, cleanup coverage | Schema reviewed; zero behavior change; tenant and pure-rule tests pass |
| Phase 2 | Dry-run and idempotent backfill, safe event projection, repair endpoints, operational metrics | Counts reconcile; rerun creates no duplicates; jobs remain unscheduled until deployment |
| Phase 3 | Owner/internal read-only Customers list, tabs, relationship detail, timeline, source deep links, navigation | Desktop/mobile accepted; cross-provider access denied; core flows unchanged |
| Phase 4 | Pro/Business notes, tasks, overrides, archive/restore, deterministic recommendations | Entitlement lifecycle and cleanup tests pass |
| Phase 5 | Editable in-app drafts and explicit provider-approved send | Consent decision approved; no-send creation proven; current preference rechecked at send |
| Phase 6 | Business saved segments and retention/automation controls if approved | Packaging and plan copy match shipped server gates |

## 14. Required Validation

The implementation must add tests for:

- Contact eligibility and provider/customer uniqueness.
- Cross-provider list, search, detail, mutation, and source-link denial.
- Backfill idempotency and every exclusion rule.
- Event idempotency, safe payload schemas, projection lag, and replay.
- Stage precedence, accepted-but-unbooked quotes, dormancy, manual override, archive restoration, and reset.
- Captured booking payments, deposits, full payments, failed payments, refunds, paid registered-customer invoices, generated receipt exclusion, and credit-note exclusion.
- Note creation/editing/soft deletion, content sanitization, provider scope, admin/customer denial, and cleanup.
- Task lifecycle, snooze, dismissal suppression, due ordering, and deduplication.
- Draft no-send creation, edit, explicit approval, consent recheck, entitlement transition, do-not-contact, duplicate-submit prevention, and one-message linkage.
- Starter, Pro, Business, trial, cancelling, grace, suspended, paused, and cancelled entitlements.
- Provider/customer role switching and guarded `/provider/customers` routing.
- Account deletion and clean-account teardown across all CRM rows.
- Desktop and 390-pixel mobile Customers list, tabs, relationship detail, note/task dialogs, filters, locked states, errors, and sticky actions.
- Existing booking, quote, message, invoice, Stripe, subscription, notification, trust, review, customer home, provider Overview, and adaptive booking regression suites.

## 15. Approval Gate

No production behavior or database schema has been changed in Phase 0. Implementation should begin only after the owner explicitly approves:

1. The safe conversation eligibility rule in P0-01.
2. Deferral of provider-assisted booking in P0-02.
3. Addition or deferral of Business saved segments in P0-03.
4. Deferral or explicit Business scope for CRM export in P0-04.
5. `crmAutomationControls` instead of custom automation construction in P0-05.
6. The customer-facing in-app relationship messaging preference in P0-06.
7. Automatic archive restoration behavior in P0-07.
8. Private managed-job and pilot state storage in P0-08.

Once these decisions are approved, Phase 1 can begin with shared contracts, additive schema, repositories, pure policy logic, cleanup integration, and feature flags—all disabled by default.

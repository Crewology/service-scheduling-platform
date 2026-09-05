# OlogyCrew Customer Relationship Layer

## Release 1 Product Requirements Document

**Status:** Draft for owner and partner approval  
**Author:** Manus AI  
**Date:** September 2026  
**Working product name:** **Customers**  
**Internal capability name:** Native Customer Relationship Layer  

## 1. Executive Summary

OlogyCrew currently helps service providers move through discovery, quotes, bookings, communication, payment, completion, reviews, and rebooking. Release 1 turns those existing transactions into a provider-owned relationship history and a simple follow-up workflow.

> **Positioning:** OlogyCrew is not adding a traditional CRM. OlogyCrew is helping providers manage and grow the customer relationships created through their service business.

The release centers on a **Customers** workspace with four views: **Leads, Customers, Follow-ups, and Activity**. OlogyCrew automatically builds each relationship from existing quote, booking, message, payment, invoice, and review activity. Providers may add private notes and tasks, review deterministic recommendations, and approve editable relationship-message drafts. Transactional messages remain automatic through existing systems; relationship and marketing messages require deliberate provider approval.

## 2. Problem Statement

Today, provider relationship data is distributed across Bookings, Quotes, Messages, Invoices, and Analytics. A provider can complete each transaction, but cannot easily answer:

1. Who is waiting for a response?
2. What is the complete history with this customer?
3. Who has become a repeat customer?
4. Who may be ready to book again?
5. What follow-up did I promise, and when is it due?

Traditional CRMs require providers to create contacts, copy transaction details, maintain pipelines, and design automations. That workload is poorly suited to small service businesses and duplicates information OlogyCrew already has.[1]

## 3. Product Vision

Without the relationship layer, the provider value proposition is **“OlogyCrew helps me get booked.”** With it, the value becomes **“OlogyCrew helps me build and grow customer relationships.”**

The release should make the existing platform loop more durable:

`Discover → Quote → Book → Communicate → Complete → Review → Rebook`

The relationship layer adds:

`Lead → Follow-up → Customer → Repeat → Relationship`

## 4. Goals and Non-Goals

### Goals

| Goal | Release-1 outcome |
|---|---|
| Improve provider activation | Providers see useful customer history without importing or configuring a CRM. |
| Improve lead response | New quote and inquiry follow-ups appear in one prioritized view. |
| Increase quote conversion | Providers receive timely, deduplicated quote follow-up recommendations. |
| Increase repeat bookings | Eligible completed customers generate provider-approved rebooking opportunities. |
| Improve provider retention | Pro and Business plans provide ongoing relationship-management value after the first booking. |
| Preserve trust | Private notes remain provider-private; relationship outreach requires consent checks and provider approval. |

### Non-goals

Release 1 will not build a general sales CRM, cold-lead database, email marketing platform, call center, external contact importer, Salesforce/HubSpot synchronization, custom code automation builder, team permission system, social-media campaign tool, AI autopilot, or automatic relationship marketing.

It will not change the approved provider Overview, need-first customer home, adaptive booking, Stripe Connect flow, payment split, evidence-based verification, or booking-linked review provenance.[2]

## 5. Personas

| Persona | Need | Release-1 value |
|---|---|---|
| Solo provider | Understand who needs attention without maintaining another system. | Automatic relationships, one activity timeline, notes, and follow-up tasks. |
| Growing provider | Convert quotes and create repeat business consistently. | Recommendations, drafts, stages, filters, and retention signals. |
| Business provider | Review relationship health across a larger customer base. | Saved segments, configurable follow-up windows, and retention reporting. |
| OlogyCrew owner/admin | Understand provider activation and automation health without surveilling private notes. | Aggregate adoption, response, task, and failure metrics. |
| OlogyCrew customer | Receive relevant provider communication without losing control of preferences. | Existing secure messaging, global opt-out precedence, and no automatic marketing blasts. |

## 6. Jobs to Be Done

When a new request arrives, a provider wants to understand the customer context and respond before the opportunity is lost. When a service is completed, the provider wants the relationship history to update automatically. When business is quiet, the provider wants to know which prior customers may reasonably need another service. When following up, the provider wants a helpful draft but must remain in control of what is sent.

## 7. Release Scope

### 7.1 In scope

| Capability | Description |
|---|---|
| Automatic relationship creation | Create a provider-scoped relationship after an eligible quote, booking, invoice, or authorized conversation. |
| Leads and customers views | Separate pre-completion opportunities from booked/completed relationships using deterministic stages. |
| Relationship detail | Show customer identity, factual summary, next action, activity timeline, private notes, tasks, and deep links to source records. |
| Activity projection | Append safe, immutable events from quote, booking, message, payment, invoice, and review transitions. |
| Captured lifetime value | Sum captured provider/customer payment value net of recorded refunds; exclude unpaid booking totals. |
| Private notes | Provider-only notes with soft deletion and no ordinary admin visibility. |
| Follow-up tasks | Manual and rule-generated tasks with due, snooze, complete, dismiss, and reopen actions. |
| Relationship stages | Automatic Lead, Quoted, Booked, Customer, Repeat, and Dormant stages plus disclosed manual override. |
| Deterministic recommendations | New-lead reply, quote follow-up, rebooking opportunity, and overdue-invoice tasks. |
| Editable message drafts | Template-based in-app drafts that require provider review and approval before sending. |
| Communication preferences | Provider-visible relationship preference with platform-wide customer opt-out precedence. |
| Filters and search | Search scoped contacts; filter by stage, service, activity, and follow-up state. |
| Admin aggregate health | Adoption, projection lag, rule failures, task outcomes, and provider relationship health without note contents. |
| Entitlement enforcement | Lifecycle-aware Starter, Pro, and Business capabilities defined in the shared entitlement model. |

### 7.2 Explicitly out of scope

| Excluded capability | Reason |
|---|---|
| Manual/external contacts | Release 1 establishes safe OlogyCrew relationship ownership before external data import. |
| Bulk campaigns | Requires additional consent, deliverability, template, throttling, and abuse controls. |
| Automatic re-engagement sends | Provider approval is a core safety rule. |
| AI-generated autonomous outreach | Deterministic templates are sufficient for the first release. |
| Custom automation builder | Platform-defined rules reduce complexity and unsafe configurations. |
| Staff seats and assignments | Requires a separate team-role and provider-organization model. |
| External CRM synchronization | Deferred until the native relationship model is stable. |
| Admin access to private notes | Conflicts with the non-surveillance product boundary. |
| Free-form testimonials or imported ratings | Reviews remain tied to completed OlogyCrew bookings. |

## 8. Proposed Entitlements

These entitlements are a product recommendation and require owner approval before pricing copy changes. The authoritative implementation must add explicit shared feature keys and server-side gates.[3]

| Capability | Starter | Pro | Business |
|---|---:|---:|---:|
| Automatic relationship list and factual transaction history | Yes | Yes | Yes |
| Existing customer messaging links | Yes | Yes | Yes |
| Private notes | No | Yes | Yes |
| Manual and recommended follow-up tasks | No | Yes | Yes |
| Editable relationship drafts | No | Yes | Yes |
| Stage override | No | Yes | Yes |
| Standard filters | Basic | Full | Full |
| Saved segments | No | No | Yes |
| Configurable inactivity windows | No | No | Yes |
| Retention and recommendation analytics | No | Basic | Full |
| Future staff assignment | No | No | Planned, not Release 1 |

Starter should not be prevented from seeing customers generated by its permitted bookings, quotes, and messages. Paid tiers add relationship-management productivity rather than hiding basic history.

## 9. Functional Requirements

### 9.1 Contacts and relationship eligibility

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-CON-01 | Create one contact per provider/customer pair after eligible activity. | Unique `(providerId, customerId)` prevents duplicates. |
| CRM-CON-02 | Resolve the provider from the authenticated user. | Client requests cannot select or override `providerId`. |
| CRM-CON-03 | Require a legitimate OlogyCrew relationship. | Constructed customer IDs without eligible activity return not found. |
| CRM-CON-04 | Exclude deleted, hidden test, and ineligible demo identities. | Backfill and live projection tests prove exclusion. |
| CRM-CON-05 | Search only the provider’s relationships. | Cross-provider names and emails never appear in results or counts. |
| CRM-CON-06 | Support archive and restore without deleting transaction history. | Archived rows leave default views; source records remain unchanged. |

### 9.2 Timeline and summaries

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-TIM-01 | Append an idempotent event for each supported source transition. | Retrying the same transition does not create a second timeline event. |
| CRM-TIM-02 | Deep-link each source event to the authorized source record. | Booking, quote, message, invoice, and review links enforce existing authorization. |
| CRM-TIM-03 | Store minimal safe metadata. | Timeline payload contains no payment credentials, authentication data, verification evidence, or private message bodies. |
| CRM-TIM-04 | Calculate captured lifetime value correctly. | Failed, unpaid, authorized-only, and refunded amounts are excluded or netted accurately. |
| CRM-TIM-05 | Show source and automatic/manual provenance. | Providers can distinguish platform activity from their own notes and actions. |

### 9.3 Stages

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-STG-01 | Derive Lead, Quoted, Booked, Customer, Repeat, and Dormant stages. | Pure resolver tests cover each stage and precedence. |
| CRM-STG-02 | Store manual stage separately. | A manual override never destroys the current derived stage. |
| CRM-STG-03 | Show override state and allow return to automatic. | UI displays “Manual stage” and a clear reset action. |
| CRM-STG-04 | Record immutable stage history. | Every effective-stage change includes source, actor when applicable, reason, and timestamp. |

### 9.4 Notes

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-NOT-01 | Create provider-private notes up to 5,000 characters. | Server sanitizes/validates and writes provider scope. |
| CRM-NOT-02 | Prevent ordinary admin and customer access. | Router authorization tests and payload-contract tests prove exclusion. |
| CRM-NOT-03 | Soft-delete notes. | Removed notes disappear from provider UI while retaining deletion metadata. |
| CRM-NOT-04 | Exclude note bodies from analytics and drafts. | Instrumentation and draft tests contain no note content. |

### 9.5 Tasks and recommendations

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-TSK-01 | Allow providers to create, complete, snooze, dismiss, and reopen tasks. | State transitions are authorized and auditable. |
| CRM-TSK-02 | Generate platform-defined deterministic recommendations. | Rule fixtures produce expected tasks without an LLM. |
| CRM-TSK-03 | Prevent duplicate recommendations. | Unique dedupe key survives retry and periodic repair. |
| CRM-TSK-04 | Suppress dismissed recommendations for the configured window. | Daily rule evaluation does not immediately recreate dismissed work. |
| CRM-TSK-05 | Never create urgent marketing tasks automatically. | Server rejects prohibited priority/action combinations. |

### 9.6 Drafts and communication

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-COM-01 | Create an editable draft from an eligible task. | No message is sent when a task or draft is created. |
| CRM-COM-02 | Require explicit provider approval. | Only `approveAndSend` may call the existing message service. |
| CRM-COM-03 | Re-evaluate authorization and preferences at send time. | A preference change after draft creation blocks send. |
| CRM-COM-04 | Keep transactional and relationship messaging separate. | Existing booking/payment/quote notifications are not routed through CRM approval. |
| CRM-COM-05 | Respect do-not-contact and global marketing preferences. | Global opt-out always overrides relationship-level state. |
| CRM-COM-06 | Link sent drafts to the existing message record. | Timeline and conversation show one authoritative sent message. |

### 9.7 Admin and operations

| ID | Requirement | Acceptance condition |
|---|---|---|
| CRM-ADM-01 | Show aggregate adoption and health. | Admin sees provider counts, task outcomes, projection lag, and failures. |
| CRM-ADM-02 | Hide private notes from normal admin APIs. | Admin response types contain no note body or note endpoint. |
| CRM-ADM-03 | Audit configuration, export, and support actions. | Audit entries include actor, target, reason, and time. |
| CRM-ADM-04 | Provide rule pause and retry controls. | Owner can disable a failing rule and retry failed projection batches idempotently. |

## 10. User Experience Requirements

The provider interface must follow the separate wireframe specification.[4] The first view prioritizes follow-up work, not analytics. The customer timeline is the centerpiece. The feature must remain useful on mobile, where providers commonly respond to leads and messages.

| UX requirement | Acceptance condition |
|---|---|
| Plain-language navigation | User-facing route and labels use Customers, Leads, Follow-ups, and Activity. |
| No manual setup | Existing relationships appear after backfill without provider configuration. |
| Clear privacy | Note editor states “Only you can see this.” |
| One primary action | Each attention row has one context-specific primary action. |
| Source continuity | Provider can reach the existing booking, quote, message, or invoice without re-entering data. |
| Mobile usability | Search, filters, tasks, notes, and approved draft sending work at 390-pixel width. |
| Safe failure | Projection delay or CRM errors never block core booking, quote, message, payment, or invoice flows. |

## 11. Automation Rules in Release 1

| Rule | Default timing | Eligibility | Output |
|---|---|---|---|
| New lead response | 12 hours after unanswered quote/inquiry | Provider has not sent a qualifying response | High-priority task |
| Quote follow-up | 48 hours after quote sent | Quote remains valid and undecided | Task plus editable draft |
| Rebooking opportunity | Configurable threshold; default 90 days after completed service | No future booking, no recent cancellation/no-show, communication allowed | Task plus editable draft |
| Overdue invoice | When provider invoice becomes overdue | Invoice remains unpaid and active | Task linking to invoice |

Rules should be event-driven when a relevant transaction changes. A bounded project-level recovery job repairs missed projections and evaluates time-based rules. It must not rely on in-process timers and must never send relationship messages automatically.

## 12. Data and Privacy Requirements

Provider relationship data is tenant-scoped. The customer’s platform-wide communication preference takes precedence over any provider observation. Full payment data, authentication data, verification documents, and private booking information are not copied into CRM tables. Activity events store source identifiers and safe summaries.

Private notes are provider content. OlogyCrew admin receives aggregate counts but cannot browse note bodies through normal product interfaces. Any future exceptional support access requires an explicit break-glass design, reason, elevated authorization, user-policy alignment, and immutable audit log; it is not part of Release 1.

Account deletion and anonymization must remove or anonymize CRM projections, tasks, drafts, preferences, and notes consistently with existing platform policy. Test cleanup must include every CRM table and verify no hidden clean-account artifacts remain.

## 13. Technical Requirements

The technical design follows the companion architecture specification.[5] The implementation must use additive schema migrations, typed Drizzle repositories, protected tRPC routers, lifecycle-aware entitlement helpers, cursor pagination, idempotent event keys, deterministic rule schemas, and existing messaging/notification services.

The CRM projection cannot become a hard dependency for transaction completion. If event insertion or projection fails after a core mutation, the failure must be observable and repairable without duplicating the booking, quote, payment, invoice, or message. Where a transaction can atomically include the outbox event, it should do so.

## 14. Analytics and Success Metrics

### Primary metrics

| Metric | Definition | Initial success direction |
|---|---|---|
| Provider CRM adoption | Eligible providers opening Customers at least twice in 30 days | Increase |
| Lead response coverage | New leads receiving a provider response or completed dismissal | Increase |
| Median quote response time | Time from quote request to provider response | Decrease |
| Recommendation completion | Due recommendations completed or intentionally dismissed | Increase with stable complaint rate |
| Rebook conversion | Eligible follow-up tasks resulting in a new booking within the attribution window | Increase |
| Returning-customer rate | Providers with customers completing two or more bookings | Increase |
| Provider retention | Paid providers active after 90 days | Increase |

### Guardrail metrics

Track relationship-message blocks, customer opt-outs, spam/support complaints, unauthorized-access denials, duplicate-event attempts, projection lag, failed rule runs, provider dismissal rate, and CRM-related booking/message error rates. A successful CRM release must not degrade core booking conversion or message delivery.

## 15. Acceptance Test Matrix

| Area | Required tests |
|---|---|
| Tenant isolation | Provider A cannot list, search, fetch, mutate, export, or message Provider B’s relationships. |
| Eligibility | A constructed customer ID without a qualifying relationship cannot create a contact. |
| Backfill | Existing quotes and bookings create one contact and deterministic events; rerun creates no duplicates. |
| Stage resolver | Every stage and precedence combination, manual override, reset, dormant restoration, and archive behavior. |
| Financial summary | Deposits, full payments, failures, refunds, free bookings, and unpaid invoices. |
| Notes | Create/edit/delete, provider scope, admin/customer denial, sanitization, and cleanup. |
| Tasks | Manual/recommended creation, due state, snooze, completion, dismissal suppression, and deduplication. |
| Drafts | No-send creation, editing, approval, preference recheck, unauthorized send denial, and message linkage. |
| Entitlements | Starter, Pro, Business, trial, cancelling, past-due grace, suspended, paused, and cancelled states. |
| Cleanup | Deleted/test users and providers leave no CRM orphan records; legitimate users remain. |
| Responsive UI | Desktop and mobile Customers list, relationship detail, task editor, note editor, filters, and errors. |
| Core regression | Booking, quotes, messaging, invoices, subscriptions, notifications, verification, and review provenance remain passing. |

## 16. Rollout Plan

| Stage | Audience | Capabilities | Exit criteria |
|---|---|---|---|
| 0. Schema and shadow projection | Internal only | Add tables, backfill, dual-write events, compare counts | No tenant leaks; sampled relationship counts reconcile with source data. |
| 1. Owner/internal review | OlogyCrew owner/admin test providers | Read-only contacts, stages, timeline, health metrics | Backfill and navigation accepted; projection lag controlled. |
| 2. Provider pilot | Selected active providers | Notes, manual tasks, recommendations, drafts | Usability flows pass; no unauthorized access or accidental sends. |
| 3. Paid-tier release | Eligible Pro and Business providers | Full approved entitlements | Support content, pricing copy, analytics, and rollback plan ready. |
| 4. Starter read-only access | Starter providers | Basic automatic customer history | Upgrade path clear and core booking/messaging unchanged. |

Each stage must be controlled by a server-side feature flag and support rollback without dropping tables or deleting relationship history.

## 17. Dependencies

The release depends on the existing authoritative entitlement resolver, provider/customer role model, booking and quote state machines, secure messaging authorization, invoice and payment status, booking-linked review rules, notification preferences, audit logging, and managed periodic execution. These foundations are already present and should be extended rather than replaced.[1] [3]

## 18. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Provider/customer data leakage | Resolve provider from authentication, include provider predicates in every query, and add adversarial authorization tests. |
| Duplicate recommendations | Deterministic event and task dedupe keys plus idempotent replay. |
| Over-messaging | Provider approval, preference checks at send time, suppression windows, and no bulk campaigns in Release 1. |
| Incorrect lifetime value | Use captured payments net of refunds, not booking totals. |
| Manual CRM burden | Automatic backfill and projection; no required contact creation or pipeline maintenance. |
| Admin surveillance concern | Aggregate admin view and no normal private-note access. |
| Core-flow regression | CRM projection is repairable and non-blocking; staged flags and broad regression suite. |
| Feature/pricing drift | Add shared entitlement keys before UI copy and test every lifecycle state. |

## 19. Owner Decisions Required Before Build

| Decision | Proposed default |
|---|---|
| Plan packaging | Starter read-only history; Pro relationship tools; Business advanced segments/analytics. |
| Rebooking inactivity threshold | 90 days, with service-category-specific tuning deferred. |
| Eligible first-contact sources | Quote, booking, provider invoice, or authorized OlogyCrew conversation. |
| Relationship send channel | Existing in-app messaging only in Release 1. |
| Stage overrides | Allow Pro and Business providers with required reason for Archive. |
| Admin private-note access | No normal access; break-glass access deferred. |

## 20. Definition of Done

Release 1 is done when an eligible provider can open Customers without setup; find leads and customers; understand a complete factual relationship history; open source transactions; add a private note; create, snooze, complete, and dismiss follow-ups; review and approve a rebooking message; and see accurate stages and captured-value summaries on desktop and mobile. Tenant isolation, consent, idempotency, cleanup, entitlement transitions, and core booking regressions must pass. No relationship message may be sent without deliberate provider action.

## 21. References

[1]: [Current OlogyCrew platform schema](../../drizzle/schema.ts)  
[2]: [Final release-hardening evidence](../../RELEASE_HARDENING_REPORT.md)  
[3]: [Authoritative provider and customer entitlement model](../../shared/entitlements.ts)  
[4]: [Provider Customers user flows and wireframes](./CRM_PROVIDER_FLOWS_AND_WIREFRAMES.md)  
[5]: [CRM technical architecture and database schema](./CRM_TECHNICAL_ARCHITECTURE.md)  
[6]: [Approved provider Overview workspace](../../client/src/pages/ProviderWorkspaceOverview.tsx)

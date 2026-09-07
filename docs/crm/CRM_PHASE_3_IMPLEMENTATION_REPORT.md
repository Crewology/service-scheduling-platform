# OlogyCrew Customers Release 1 — Phase 3 Read-Only Pilot Report

**Status:** Complete for the owner pilot  
**Pilot provider:** Provider 1, Chisolm Audio  
**Provider-authored writes:** Disabled  
**Recommendations and drafts:** Disabled  
**Relationship message sending:** Disabled  
**Managed repair schedule:** Not configured

## Delivered Pilot

OlogyCrew now has a private, read-only **Customers** workspace at `/provider/customers` and a relationship-detail route at `/provider/customers/:contactId`. Both routes are protected by the existing provider guard, the authenticated user's server-derived provider identity, the lifecycle-aware `customerHistory` entitlement, the private pilot allow-list, and the private read-UI flag.[1] [2]

The workspace implements the four approved tabs: **Leads**, **Customers**, **Follow-ups**, and **Activity**. Leads, customers, and activity are backed by provider-scoped projection queries. Follow-ups intentionally remains a read-only pilot explanation because tasks and recommendations are not enabled in this phase.[2]

The relationship detail presents factual aggregate data and an append-only timeline with safe links back to authoritative OlogyCrew records. It does not expose message bodies, payment secrets, addresses, unrestricted source snapshots, notes, tasks, drafts, segments, or send controls.[1] [3]

## Provider Workspace Integration

The approved provider Overview now shows **Customers** in its desktop navigation, mobile navigation, and Business Pulse entry point only when the secured access response says the account is visible. Non-pilot providers do not receive the entry point. Existing Overview, Bookings, Services, Calendar, Money, My Page, and More destinations remain unchanged.[4]

The Customers workspace displays the provider's actual business identity, **Chisolm Audio**, and the existing mobile Provider/Customer role toggle. The interface is intentionally labeled **Read-only pilot** and states that nothing in the workspace sends a message or changes a booking.[2] [3]

## Controlled Pilot Projection

The owner-approved bounded backfill and reconciliation were executed for provider 1 only. Read UI was enabled only after source parity passed.

| Pilot state | Verified result |
|---|---:|
| Projected relationships | 2 |
| Provider self-relationships | 0 |
| Activity events | 11 |
| New leads | 1 |
| Customers | 1 |
| Relationships needing response | 0 |
| Repeat customers | 0 |
| Captured relationship value | $0 |

The broader pre-pilot dry run identified five eligible relationships across the platform, but only relationships belonging to provider 1 were written. No other provider is configured as a pilot.

## Pilot Corrections

Visual and data reconciliation found and corrected three important classification issues. First, completed or cancelled history, payments, and passive invoice activity no longer create false **Needs response** signals; only unresolved pending bookings, pending or accepted quotes, unanswered customer messages, and unresponded booking-linked reviews count. Second, the provider owner is excluded from their own relationship projection. Third, provider retention totals exclude self-bookings so Overview and Customers show the same customer count.[4] [5]

## Rollout Controls

| Private control | Final state |
|---|---|
| Pilot provider IDs | `[1]` |
| Projection writes | Enabled for the pilot only |
| Read UI | Enabled for the pilot only |
| Repair jobs | Disabled |
| Provider writes | Disabled |
| Recommendations | Disabled |
| Draft sending | Disabled |

These values live in the private Customers operational store and are not exposed through the public platform-settings API.[1]

## Validation Evidence

| Validation | Result |
|---|---|
| Focused and adjacent pilot regression matrix | 28 files passed; 226 tests passed |
| TypeScript | Zero errors |
| Production build | Successful |
| Desktop visual review | Passed for Overview, all four Customers tabs, and relationship detail |
| Mobile visual review | Passed at 390 × 844 for Overview, tabs, list, filters, relationship detail, and role toggle |
| Runtime review | No current Customers API, React, authorization, or navigation errors |
| Tenant boundary | Provider ID is derived server-side; non-pilots and cross-provider contacts are rejected |

A separate repository-wide legacy run also surfaced historical fixture and source-contract drift in unrelated suites. The focused Customers and adjacent operational matrix is green; the unrelated legacy failures should be reconciled as an independent maintenance task rather than by weakening current security or product behavior.

## Next Approval Boundary

The next approved phase should enable provider-authored **notes and follow-up tasks** for this same pilot account only. Relationship message drafts, sending, automation controls, schedules, saved segments, exports, and broad provider rollout should remain disabled until their specific later phases and acceptance criteria are approved.

## References

[1]: ../../server/customersRouter.ts "Private Customers read API"
[2]: ../../client/src/pages/ProviderCustomers.tsx "Customers workspace"
[3]: ../../client/src/pages/ProviderCustomerDetail.tsx "Relationship detail"
[4]: ../../client/src/pages/ProviderWorkspaceOverview.tsx "Provider Overview navigation"
[5]: ../../server/db/analytics.ts "Provider retention aggregation"

# Customers Provider-Wide Entitlement Rollout Report

## Executive summary

Customers Release 1 has moved from a two-provider private pilot to a **lifecycle-entitlement-gated provider rollout**. Every active, non-deleted, non-demo, non-test provider may access only the Customers capabilities granted by the authoritative provider subscription resolver. Every Customers query and mutation continues to derive the provider from the authenticated session and enforce provider/contact/task/draft scope, so no provider receives platform-wide customer access.[1] [2]

Administrative clearance is now restricted to **Gary Chisolm** (`garychisolm30@gmail.com`) and **Winston Williams** (`wwilliams@visionkwest.com`). Gary Studios remains an ordinary plan-gated provider and has no admin clearance.[3]

| Area | Final result |
|---|---|
| Provider audience | Lifecycle-entitled active providers; demo and reserved-test providers excluded |
| Starter access | Customer history only |
| Pro and Business access | Lifecycle-granted private notes, follow-ups, drafts, retention analytics, manual stages, and custom-automation capability contract |
| Provider data boundary | Own qualified relationships only; constructed cross-provider IDs return Not Found |
| Administrator roster | Exactly Gary Chisolm and Winston Williams |
| Rollback cohort | Chisolm Audio and Winston’s restored provider profile |
| Provider-wide backfill | 12 assessed providers, six eligible relationships, one self-exclusion, zero failures |
| Final reconciliation | Six expected and six actual relationships; zero missing, extra, or stale records |

## What was implemented

The private audience now has two reversible modes: `pilot` and `lifecycle_entitled`. Provider access, navigation, source projection, owner operations, and aggregate health all use the same server-side audience resolver. Pilot mode remains available solely as a rollback path. The active mode is `lifecycle_entitled`.[1] [4]

Provider access requires an authenticated provider profile, active and non-deleted provider state, exclusion from reserved/demo/test identities, the private read-UI flag, and lifecycle entitlement to `customerHistory`. Private notes, follow-ups, drafts, confirmed sending, manual stages, segments, retention analytics, and custom automation remain separately gated by their canonical lifecycle capabilities. Frontend code consumes server-provided capability booleans and lifecycle guidance; it does not infer permissions from plan names.[1] [2] [5]

The provider-wide source hook uses the same audience and identity rules. It projects only authoritative qualified interactions and continues to exclude provider self-records, deleted users, demo/test identities, and non-qualifying sources. Existing bookings, quotes, payments, refunds, registered invoices, qualified messages, and booking-linked reviews remain authoritative.[4] [6]

## Administrative clearance

A centralized named-administrator policy now applies to authenticated context, the shared admin procedure, Customers operations, Terms administration, provider verification, social-media administration, and Team Management. A persisted legacy admin role cannot grant access to an unapproved identity. Login normalization removes unapproved legacy admin clearance, and admin team search and promotion candidates are limited to the two approved emails.[3]

Winston’s user already held super-admin clearance, but his provider profile was soft-deleted. With explicit owner approval, the provider profile was restored to active, non-deleted status. The profile currently has no active services, so restoration did not expose a service catalog. Winston’s Customers provider access is governed by his current Starter lifecycle entitlement and therefore provides customer history only until he selects a qualifying paid plan. Admin clearance does not bypass provider entitlements.[1] [3]

Gary Studios remains an active ordinary provider with its existing lifecycle-based Customers access. It was removed from the rollback pilot cohort and was never granted administrative clearance.

## Backfill, reconciliation, and rollback

Before the audience switch, a non-writing assessment evaluated the exact 12-provider eligible audience. It found six qualified relationships, one provider self-record to exclude, and zero projection failures. The assessed audience mode and all rollout flags remained unchanged.[7]

The audited rollout then backfilled the same 12 provider profile IDs while still in pilot mode, switched the audience to `lifecycle_entitled`, and reconciled the entire active audience. The final result contained six expected and six actual relationships with zero missing, extra, or stale relationships. All existing private records and the prior live consent/message evidence were preserved.[4] [7]

The stored rollback cohort is `[1, 660001]`: Chisolm Audio and Winston’s provider profile. A live rollback drill switched to pilot mode, verified exactly that cohort, and restored lifecycle-entitled access with all flags unchanged. No projection data was deleted during the drill.[4]

## Aggregate administration

Admin → Customers Rollout now reports the lifecycle-entitled audience rather than a private pilot. It shows aggregate adoption, relationship counts, task outcomes, projection lag, automation failures, provider lifecycle health, operational flags, integrity checks, and non-writing provider access review. It does not expose customer identity, private notes, task descriptions, draft or message bodies, addresses, or payment data.[8]

Starter providers are shown accurately as history-only rather than incorrectly blocked. Provider access review remains non-writing and has no enrollment or rollout action. Team Management now states the fixed two-admin policy and uses mobile cards for complete Gary and Winston controls at narrow widths.[3] [8]

## Database and operational changes

No schema migration was required. The rollout used existing additive Customers tables and private operational state.

| State | Final verified value |
|---|---|
| `customersAudienceMode` | `lifecycle_entitled` |
| `customersPilotProviderIds` | `[1,660001]` rollback cohort |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersDraftSending` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |
| Super admins | `garychisolm30@gmail.com`, `wwilliams@visionkwest.com` |
| Projected relationships | 6 |
| Provider self-contacts | 0 |
| Enabled automation rules / runs / saved segments | 0 / 0 / 0 |

## Files changed

The rollout changed 47 source, test, tracker, and documentation files. The principal implementation files are listed below.

| Concern | Primary files |
|---|---|
| Audience and identity | `shared/crm.ts`, `server/crm/access.ts`, `server/crm/identity.ts`, `server/db/crm/operationalState.ts`, `server/db/providers.ts` |
| Projection and operations | `server/crm/projection.ts`, `server/crm/operations.ts`, `server/crmOperationsRouter.ts` |
| Provider API and UI | `server/customersRouter.ts`, `client/src/pages/ProviderCustomers.tsx`, `client/src/pages/ProviderCustomerDetail.tsx` |
| Aggregate administration | `server/crm/health.ts`, `server/crm/betaReadiness.ts`, `client/src/pages/admin/CustomersPilotHealthPanel.tsx`, `client/src/pages/AdminDashboard.tsx` |
| Named administration | `server/adminPolicy.ts`, `server/_core/context.ts`, `server/_core/trpc.ts`, `server/adminRouter.ts`, `server/db/users.ts`, `server/termsRouter.ts`, `server/verificationRouter.ts`, `server/routers/socialMediaRouter.ts`, `client/src/pages/admin/TeamManagementPanel.tsx` |
| Guidance | `client/src/pages/HelpCenter.tsx`, `docs/crm/CRM_PROVIDER_WIDE_ROLLOUT_ASSESSMENT.md`, `docs/crm/CRM_PROVIDER_WIDE_ROLLOUT_DESIGN.md` |
| Rollout regressions | `server/customers-provider-rollout.test.ts`, `server/customers-provider-rollout-admin.test.ts`, and adjacent Customers/admin suites |

## Validation

| Gate | Result |
|---|---|
| Full OlogyCrew regression suite | **135 files and 1,782 tests passed** |
| Provider-wide audience and rollback | Pilot rollback, lifecycle-entitled access, Starter history, paid private tools, reserved-provider exclusion, and audited operations passed |
| Named administrators | Only Gary and Winston authorized; Gary Studios and other identities denied |
| Real provider access | Chisolm Audio and Gary Studios isolated; Winston restored with Starter history; Prattis Test excluded |
| Projection | 12-provider dry-run and backfill; six relationships; zero failures; clean reconciliation |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed |
| Desktop review | Provider Customers, aggregate rollout health, and fixed admin roster reviewed |
| Mobile review | Customers, aggregate rollout, and responsive Gary/Winston admin cards reviewed at 390 pixels |
| Rollback drill | Pilot cohort verified and lifecycle-entitled mode restored successfully |

The complete suite initially exposed legacy tests that used arbitrary admin identities or made real notification-provider calls during provider and booking fixtures. Those tests were corrected to use the approved Gary admin identity and local notification mocks. Production authorization and notification behavior were not weakened.

## Warnings and unchanged behavior

Vitest still reports the known process-close timeout after all assertions pass because an existing open handle prevents immediate exit. The production build still reports the existing large-bundle advisory. Neither warning indicates a failed assertion or build.

Pricing, public plan copy, provider subscription economics, the 60/40 partner split, Stripe destination-charge behavior, authoritative booking/quote/payment/invoice/message/review data, and inactive-provider protections remain unchanged. AI, recommendations, automation execution, schedules, saved segments, exports, bulk messaging, external CRM, manual contacts, and repair jobs remain disabled.

## Deviations from the original private-pilot design

The approved product boundary changed from an explicit two-provider allowlist to lifecycle-entitled provider access. The implementation preserves the allowlist as an emergency rollback cohort rather than deleting it. This is the only intentional rollout-model deviation. No Release 1 feature scope was expanded.

## References

[1]: ../../server/crm/access.ts "Lifecycle-entitled Customers provider access"
[2]: ../../server/customersRouter.ts "Provider-scoped Customers API"
[3]: ../../server/adminPolicy.ts "Fixed Gary-and-Winston administrator policy"
[4]: ../../server/crm/operations.ts "Audited Customers rollout operations"
[5]: ../../shared/entitlements.ts "Authoritative lifecycle capability catalog"
[6]: ../../server/crm/projection.ts "Authoritative provider-scoped Customers projection"
[7]: ./CRM_PROVIDER_WIDE_ROLLOUT_ASSESSMENT.md "Provider-wide rollout assessment"
[8]: ../../server/crm/health.ts "Aggregate provider-wide Customers health"


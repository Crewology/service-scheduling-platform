# Customers Provider-Wide Rollout Assessment

> **Implemented outcome — September 9, 2026:** The audited 12-provider backfill and reconciliation completed with six qualified relationships, one self-exclusion, and zero failures. The active audience is now `lifecycle_entitled`; the rollback cohort is Chisolm Audio and Winston’s restored provider profile. See [the final rollout report](./CRM_PROVIDER_WIDE_ROLLOUT_REPORT.md).

## Executive conclusion

The requested change is a **moderate controlled rollout, not a rebuild**. Customers already derives provider identity from authenticated server context, scopes every relationship and private record by provider, resolves lifecycle entitlements centrally, and blocks constructed cross-provider IDs. The main engineering change is replacing private-pilot membership as the audience switch with a reversible lifecycle-entitled audience mode, then backfilling qualified relationships for the broader active-provider cohort.[1] [2]

## Clarified access model

| Access type | Intended rule |
|---|---|
| Provider Customers access | Available to active providers according to authoritative lifecycle entitlements |
| Starter provider | Customer history only |
| Pro provider | Customer history plus the approved Pro private tools |
| Business provider | Customer history plus the approved Business capabilities; deferred products remain disabled |
| Provider data scope | Only qualified relationships owned by that provider |
| Administrative clearance | Only `garychisolm30@gmail.com` and `wwilliams@visionkwest.com` |
| Gary Studios | Ordinary provider access based on its lifecycle plan; no administrative elevation |

Capability declaration and product availability remain separate. `crmSegments`, `crmRetentionAnalytics`, and `crmCustomAutomations` may exist in the entitlement catalog without enabling saved-segment UI, retention reporting, recommendation jobs, or custom automation execution.[3]

## Current-state evidence

The database currently contains exactly two admin users: Gary Chisolm and Winston Williams. Both are `super_admin`. Gary Studios is an ordinary provider account with no admin role. A stale auto-promotion email remains in the user upsert source and must be replaced with the two owner-approved addresses before rollout.[4]

| Provider audience evidence | Current value |
|---|---:|
| Active, non-deleted providers | 49 |
| Active providers with authoritative booking, quote, or registered-invoice candidates | 41 |
| Premium active subscriptions | 1 |
| Pro active subscriptions | 2 |
| Pro trials | 3 |
| Starter active subscriptions | 4 |
| Starter cancelled records | 2 |
| Active providers without a subscription row | 37 |

Providers without a paid lifecycle record resolve through the existing authoritative entitlement defaults rather than frontend assumptions. Projection eligibility must continue to reject inactive or deleted providers and customers, provider self-contacts, reserved test identities, official demo supply, and unqualified source activity.[2] [3]

## Required implementation boundary

The rollout needs a private operational audience mode with `pilot` as the rollback-safe default and `lifecycle_entitled` as the approved provider audience. Read access, provider writes, draft sending, live source projection, owner backfill, reconciliation, and aggregate monitoring must all use the same audience contract. The previous pilot list should remain stored as a rollback cohort but cease being the provider authorization boundary while lifecycle-entitled mode is active.

Provider-wide backfill must run in bounded, idempotent batches. It must assess before writing, preserve source authority, retain existing Chisolm Audio and Gary Studios private records, and record failures without blocking authoritative booking, quote, invoice, payment, message, or review workflows.[2] [5]

## Non-writing provider-wide assessment

The active, non-deleted, non-demo, non-test provider audience contains **12 providers**. The exact IDs are `1, 1020001, 1140001, 1350001, 1440001, 1620001, 1650001, 1680001, 1680002, 1740001, 1770001, 1800001`.

The super-admin dry-run assessed all 12 providers in one bounded request. It found seven authoritative provider/customer candidates, six eligible relationships, one provider self-relationship exclusion, and zero failures. It wrote no contact or activity row. The audience remained `pilot`, the rollback list remained `[1, 1350001]`, and every rollout flag remained unchanged. The dry-run updated only the private operational metrics record, as designed.

| Assessment metric | Result |
|---|---:|
| Providers assessed | 12 |
| Authoritative candidates | 7 |
| Eligible relationships | 6 |
| Provider self-exclusions | 1 |
| Other exclusions | 0 |
| Failures | 0 |
| Projection rows written | 0 |

## Named administrator boundary

Administrative role remains separate from provider Customers access. Gary and Winston may use aggregate administration because they are the two approved administrators. Their provider workspaces must still follow provider ownership and lifecycle entitlements. Winston’s current Starter subscription grants customer history but does not grant Pro private tools; administrative clearance must not silently bypass provider plan gates.[3] [4]

## No product-scope expansion

This rollout does not change prices, public plan copy, Stripe behavior, authoritative source records, or customer communication consent. It does not enable AI, recommendations, automation execution, scheduled work, saved segments, exports, bulk messaging, external CRM, manual contacts, or admin access to provider-private content.

## References

[1]: ../../server/customersRouter.ts "Customers server-derived provider access and tenant guards"
[2]: ../../server/crm/projection.ts "Authoritative Customers projection and eligibility"
[3]: ../../shared/entitlements.ts "Lifecycle-aware provider capability catalog"
[4]: ../../server/db/users.ts "User upsert and admin assignment"
[5]: ../../server/crm/operations.ts "Bounded projection and reconciliation operations"

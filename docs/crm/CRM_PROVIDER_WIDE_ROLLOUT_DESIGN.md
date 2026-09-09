# Customers Provider-Wide Entitlement Rollout Design

> **Implemented outcome — September 9, 2026:** This reversible lifecycle-entitled rollout design is active. Provider access remains server-scoped and plan-gated, while pilot mode remains available with the Gary-and-Winston rollback cohort. See [the final rollout report](./CRM_PROVIDER_WIDE_ROLLOUT_REPORT.md).

## Objective

Customers will move from a named private-pilot audience to **active lifecycle-entitled providers**. Each provider continues to access only its own qualified OlogyCrew relationships. Administrative clearance remains a separate platform role restricted to Gary Chisolm and Winston Williams.[1] [2]

## Reversible audience model

Add one private operational setting, `customersAudienceMode`, with two supported values.

| Mode | Provider audience | Use |
|---|---|---|
| `pilot` | Only IDs stored in `customersPilotProviderIds` | Immediate rollback and controlled tests |
| `lifecycle_entitled` | Active, non-deleted providers whose effective lifecycle tier grants `customerHistory` | Approved provider rollout |

The setting defaults to `pilot` when absent or invalid. The prior `[1, 1350001]` pilot list remains stored as the rollback cohort. Changing audience mode never deletes contacts, activity, notes, tasks, drafts, or authoritative source records.

## Access composition

Every provider read still requires the provider record to belong to the authenticated user, the provider to be active, the provider to be in the selected audience, the global read flag to be on, and effective lifecycle access to grant `customerHistory`. Notes, follow-ups, manual stages, drafts, and confirmed sending continue to add their existing feature entitlement and private rollout flag checks.[1] [3]

| Effective provider access | Customers result |
|---|---|
| Starter | Relationship history only |
| Pro | History plus private notes, follow-ups, drafts, confirmed consent-aware sending, and manual stages |
| Business | Pro capabilities plus declared Business capabilities; deferred UI and jobs remain disabled |
| Inactive, deleted, suspended without effective access, or non-provider | No Customers access |

No frontend component may infer access from a tier name. It renders server-provided capability booleans and lifecycle reason only.

## Projection and backfill

Live booking, quote, invoice, message, payment, refund, and review hooks continue to queue non-blocking projection. Under `lifecycle_entitled`, the projection gate checks the active provider and effective `customerHistory` entitlement instead of pilot membership. Relationship eligibility remains unchanged: only authoritative qualified interactions are projected; provider self-contacts, deleted users, inactive providers, reserved test identities, official demo supply, and unqualified message traffic remain excluded.[2]

The owner backfill remains confirmation-gated, bounded to at most 25 providers and 250 relationships per request, cursor-aware, idempotent, and auditable. Provider-wide rollout will use a non-writing assessment first, then consecutive explicit provider batches. A failure does not alter the audience mode automatically and does not block authoritative product transactions.

## Administrative boundary

The approved administrator identities are:

| Email | Administrative role | Provider access |
|---|---|---|
| `garychisolm30@gmail.com` | Super admin and owner | Chisolm Audio, lifecycle gated |
| `wwilliams@visionkwest.com` | Super admin | Winston provider, lifecycle gated |

Gary Studios remains an ordinary provider. The stale auto-promotion address is removed. Application promotion procedures reject any email outside the named allowlist. Administrative role never bypasses a provider’s Customers plan entitlement when that person enters the provider workspace.[4]

Winston is currently on Starter. He will receive aggregate admin oversight and provider customer history. Private notes, follow-ups, drafts, sending, and manual stages remain unavailable until his provider subscription independently grants those capabilities.

## Aggregate owner oversight

Admin monitoring will change from “private pilot” language to **Customers rollout** and calculate adoption and health across the lifecycle-entitled audience. It remains aggregate-only: provider name and provider-level operational counts are permitted, but customer identity and private content are not. Metrics include eligible and active providers, providers with projected relationships, relationships, task outcomes, projection lag, automation failures, lifecycle access health, tenant integrity, and sent-link integrity.[5]

## Rollback

The owner may restore `customersAudienceMode` to `pilot` through the audited configuration path. This immediately restricts provider access and live projection to the stored Chisolm Audio and Gary Studios cohort without deleting broader projected records. The existing disable order remains: confirmed sending, provider writes, read UI, then projection writes.

## Unchanged boundaries

Prices, public plan copy, subscription behavior, transaction authority, customer message consent, and source records remain unchanged. AI, recommendations, automation execution, schedules, saved segments, exports, bulk messaging, external CRM, manual contacts, and repair jobs remain disabled.

## References

[1]: ../../server/customersRouter.ts "Customers provider access and write guards"
[2]: ../../server/crm/projection.ts "Customers source projection and relationship eligibility"
[3]: ../../shared/entitlements.ts "Authoritative lifecycle-aware provider entitlements"
[4]: ../../server/db/users.ts "User role assignment and admin auto-promotion"
[5]: ../../server/crm/health.ts "Aggregate Customers operational health"

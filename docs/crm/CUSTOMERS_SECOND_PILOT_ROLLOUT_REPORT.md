# Customers Second Private Pilot Rollout Report

## Executive summary

Gary Studios has joined Chisolm Audio as the **only second provider** in the private Customers pilot. The owner upgraded Gary Studios through the normal provider plan flow, Chisolm Audio created one legitimate no-payment quote relationship through the normal customer flow, the non-writing assessment found one eligible relationship, and the audited owner path expanded the allowlist to exactly `[1, 1350001]` before backfilling only Gary Studios.[1] [2]

| Rollout gate | Final result |
|---|---|
| Named provider | Gary Studios, provider `1350001` |
| Provider availability | Active, not deleted |
| Lifecycle access | Pro trial, effective Basic tier, all approved Customers private tools enabled |
| Qualified relationship | One owner-confirmed Studio Blocks quote from Chisolm Audio |
| Non-writing assessment | One candidate, one eligible relationship, zero failures |
| Audited allowlist | Exactly Chisolm Audio and Gary Studios |
| Backfill | One eligible relationship projected; no manual contact insertion |
| Monitoring | Live test verified and overall Ready |

## Eligibility and relationship setup

Gary Studios initially remained outside the pilot because it was on Starter and had no qualified relationships. The owner upgraded the account to a Pro trial through the normal dev subscription flow. The lifecycle resolver then returned effective Basic access with customer history, private notes, follow-ups, drafts, confirmed sending eligibility, and manual stage controls.[3] [4]

Chisolm Audio submitted one no-payment Studio Blocks quote request to Gary Studios through the normal dev customer flow. The request was explicitly labeled as a second-provider pilot validation interaction and requires no service or payment. Before expansion, the database contained exactly one authoritative quote, zero Gary Studios Customers contacts, and zero Gary Studios events.

The non-writing owner dry-run reported one candidate relationship, one eligible relationship, zero exclusions, and zero failures. No allowlist or projection data changed during assessment.[1] [2]

## Audited expansion and rollback safety

The super-admin configuration procedure expanded the allowlist from `[1]` to `[1, 1350001]`. Projection writes, provider read UI, provider writes, and confirmed draft sending remained on. Repair jobs and recommendations remained off. The one-time operation included an automatic restore-to-`[1]` branch if backfill failed or returned an unexpected count; restoration was not needed.[1]

The confirmation-gated backfill ran only for Gary Studios and projected one relationship from the authoritative quote. No manual or fabricated contact was inserted. Reconciliation returned four expected relationships, four actual relationships, zero missing, extra, or stale relationships, and one provider self-record correctly excluded.[1] [2]

## Isolation and provider access

Authenticated caller tests verify that Chisolm Audio and Gary Studios each receive visible Customers access with the correct lifecycle capabilities. Gary Studios can load its own projected relationship. Constructing a Chisolm Audio relationship ID from the Gary Studios session returns Not Found, and constructing the Gary Studios relationship ID from the Chisolm Audio session also returns Not Found.[5] [6]

No provider ID or recipient identity is accepted from the client. The shared UI, read APIs, private notes, tasks, drafts, manual stages, and confirmed-send procedures continue to derive provider ownership from the authenticated user.[5]

## Monitoring and responsive review

Admin → Customers Pilot reports **Live test verified** and overall **Ready**. Desktop and 390-pixel mobile reviews show two active allowlisted providers, four relationships, one currently opted-in relationship, one valid sent draft, and zero integrity issues. Both provider rows remain contained within the existing responsive aggregate table.[2] [7]

| Final aggregate | Verified value |
|---|---|
| Active / allowlisted providers | 2 / 2 |
| Relationships | 4 |
| Chisolm Audio relationships | 3 |
| Gary Studios relationships | 1 |
| Opted-in relationships | 1 |
| Sent drafts / live-validated relationships | 1 / 1 |
| Safe activity events | 18 |
| Self-contacts / non-pilot contacts | 0 / 0 |
| Scoped-child mismatches | 0 |
| Missing / stale / lagging projections | 0 / 0 / 0 |
| Sent-link issues | 0 |

## Validation

| Validation gate | Result |
|---|---|
| Focused two-provider monitoring, access, and isolation matrix | 5 files and 76 tests passed |
| Complete adjacent Customers and lifecycle matrix | 21 files and 199 tests passed |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed; existing large-chunk advisory remains non-blocking |
| Desktop owner review | Ready dashboard shows both provider rows and current totals |
| Mobile owner review | Full dashboard reviewed at 390 × 844 without horizontal page overflow |
| Fresh runtime review | Customers health requests returned 200 and no rollout-related application error occurred |

Vitest continues to print the known process-close timeout after passing suites because an existing open handle prevents immediate exit. All assertions passed. A stale development Stripe Connect authentication log appeared while Gary Studios was changing plans; the authoritative provider subscription is nevertheless stored as an active Pro trial and Customers lifecycle access resolves correctly. No Stripe call is part of Customers pilot authorization.

## Final private state and operational note

| Private state | Verified value |
|---|---|
| Pilot providers | `[1, 1350001]` only |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersDraftSending` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |
| Enabled automation rules / runs / saved segments | 0 / 0 / 0 |
| Gary Studios notes / tasks / drafts | 0 / 0 / 0 |
| Audited two-provider configuration changes | 1 |

Gary Studios’ pilot tools are lifecycle gated. Its current Pro trial ends **September 23, 2026**. If the account returns to Starter or otherwise loses effective paid access, private notes, follow-ups, drafts, sending, and manual stages are denied automatically even while the provider ID remains allowlisted. The owner monitoring workspace will report the provider availability and access check as Blocked until access is restored or the provider is removed from the pilot.[2] [3]

No third provider, repair job, recommendation, AI capability, automation rule, schedule, segment, export, or bulk messaging capability was enabled.

## References

[1]: ../../server/crmOperationsRouter.ts "Audited Customers private configuration and backfill procedures"
[2]: ../../server/crm/health.ts "Privacy-safe multi-provider pilot monitoring"
[3]: ../../server/crm/access.ts "Lifecycle-aware Customers provider access"
[4]: ../../shared/entitlements.ts "Authoritative provider plan capabilities"
[5]: ../../server/customersRouter.ts "Provider-scoped Customers APIs"
[6]: ../../server/customers-phase8.test.ts "Two-provider readiness and cross-tenant regressions"
[7]: ../../client/src/pages/admin/CustomersPilotHealthPanel.tsx "Owner-only aggregate monitoring workspace"


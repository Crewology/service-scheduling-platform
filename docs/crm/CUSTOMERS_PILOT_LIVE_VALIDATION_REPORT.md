# Customers Private Pilot Live Validation Report

## Executive summary

The previously deferred customer opt-in and one-message exercise is **complete and passed** using the owner-controlled Gary Studios account as a qualified Chisolm Audio relationship. The customer enabled permission through their own notification settings, Chisolm Audio received current send availability, the owner reviewed and explicitly confirmed one low-risk draft, exactly one existing OlogyCrew in-app message was created, and the customer confirmed receipt. No email, SMS, push, notification record, automatic reply, automation run, or message-body copy in Customers activity was created.[1] [2]

| Validation step | Result |
|---|---|
| Qualified relationship | Passed through a normal, no-payment Audio Enhancement quote request |
| Default consent | Confirmed off before customer action |
| Customer opt-in | Saved by Gary Studios through its own dev notification settings |
| Provider availability | Chisolm Audio immediately showed current relationship-message permission |
| Private draft | Saved unsent with zero messages and zero notifications |
| Deliberate confirmation | Exact recipient and text presented to and approved by the owner |
| Delivery | One linked in-app message created and one sent draft recorded |
| Customer receipt | Confirmed by the Gary Studios account in Messages |
| External side effects | Zero email, SMS, push, notification, automatic reply, or automation records |
| Customer’s final permission | Left on at the owner’s request |

## Legitimate relationship setup

Gary Studios had no prior qualifying Chisolm Audio interaction. The owner submitted a clearly labeled, no-payment Audio Enhancement quote request through the normal customer flow. Because the request was submitted through the currently published application while the new Customers work remained unpublished, it did not run the current dev projection path. The existing super-admin-only, confirmation-gated backfill procedure then projected the authoritative quote without inserting or fabricating a Customers contact.[3] [4]

The resulting relationship is provider 1 scoped, stage **Lead**, has one safe quote event, and is not a provider self-contact. The audited backfill processed the full pilot idempotently and excluded the provider’s self-record.[3]

## Consent and send validation

The Gary Studios account enabled **Allow relationship messages** through its own notification settings on the dev preview. Database verification confirmed the global permission was on, the relationship was active, and no relationship-level block or do-not-contact marker existed. The Chisolm Audio relationship detail immediately changed to state that the customer currently permits provider relationship messages.[1] [5]

Chisolm Audio saved one private draft. Before final confirmation, the draft was still in `draft` state with no message link, zero matching message rows, zero notification rows, and only the original quote event. The exact recipient and draft text were then presented to the owner through the required confirmation step. Only after explicit confirmation was **Send in-app message** selected.[1] [2]

The committed result contains one sent draft, one authoritative message link, the approving provider user, approval and send timestamps, and one body-free message activity event. The existing direct conversation displays the message once and contains no automatic reply. Gary Studios independently confirmed that the message appeared in its Messages experience.[2]

## Privacy and side-effect evidence

| Evidence | Final value |
|---|---|
| Messages linked to the draft | 1 |
| Notification rows created since the draft | 0 |
| Automation runs for the relationship | 0 |
| Message-body matches in Customers activity summary or metadata | 0 |
| Sent-draft linkage issues | 0 |
| Provider self-contacts | 0 |
| Non-pilot Customers contacts | 0 |
| Enabled recommendation or automation rules | 0 |
| Saved segments | 0 |

The implementation continues to create only an ordinary in-app message. It does not call the general notification helper or any external delivery provider from the Customers send transaction.[2]

## Monitoring result and rollout decision

Admin → Customers Pilot now reports **Live test verified** and an overall **Ready** state. It shows one of three relationships opted in, one sent draft, one live-validated relationship, zero sent-link issues, zero tenant or projection issues, and every future-capability safeguard ready.[6]

**Recommendation: approve preparation for one additional controlled provider pilot, but do not add that provider automatically.** The live consent and delivery gate is now satisfied, and the current monitoring state has no blocked or disabled check. Expansion should remain limited to one carefully selected provider with an active qualifying entitlement, a reachable owner-controlled customer participant, at least one legitimate non-self relationship, and direct feedback availability. Adding the candidate still requires a separate owner approval and the audited allowlist procedure.[6] [7]

## Validation gates

| Gate | Result |
|---|---|
| Focused health, consent, send, repository, preference, projection, and entitlement matrix | 6 files and 90 tests passed |
| Complete adjacent Customers and lifecycle matrix | 21 files and 197 tests passed |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed; existing large-chunk advisory remains non-blocking |
| Desktop interaction | Relationship draft, confirmation, sent state, conversation, and owner monitoring reviewed |
| Mobile monitoring | Ready state reviewed at 390 × 844 with contained tables and readable status cards |

Vitest continues to print the known process-close timeout after passing suites because an existing open handle prevents immediate process exit. All assertions passed and the final validation command completed successfully.

## Final private state

| Private state | Verified value |
|---|---|
| Pilot providers | `[1]` only |
| Qualified relationships | 3 |
| Provider self-contacts / non-pilot contacts | 0 / 0 |
| Customers currently opted in | 1 of 3 |
| Sent drafts / live-validated relationships | 1 / 1 |
| Safe activity events | 14 |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersDraftSending` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |

No second provider was added, no repair or recommendation capability was enabled, and no published deployment occurred during this validation.

## References

[1]: ../../client/src/pages/ProviderCustomerDetail.tsx "Provider draft review and deliberate confirmation experience"
[2]: ../../server/db/crm/drafts.ts "Atomic consent-aware exactly-once in-app message transaction"
[3]: ../../server/crmOperationsRouter.ts "Super-admin confirmation-gated Customers backfill"
[4]: ../../server/crm/projection.ts "Authoritative relationship projection"
[5]: ../../client/src/pages/NotificationSettings.tsx "Customer-controlled relationship-message permission"
[6]: ../../server/crm/health.ts "Evidence-based private pilot readiness"
[7]: ./CUSTOMERS_PILOT_ROLLOUT_CHECKLIST.md "Customers private pilot rollout checklist"


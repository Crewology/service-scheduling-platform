# Customers Phase 7 Implementation Report

## Executive summary

Customers Phase 7 adds **consent-aware, provider-confirmed in-app draft sending** for Chisolm Audio, provider 1, as the sole private pilot. A saved draft remains private until the provider opens a separate confirmation, reviews the exact body, and deliberately selects **Send in-app message**. The server then rechecks provider access, relationship state, customer permission, draft state, and exact content before creating one authoritative OlogyCrew message.[1] [2]

| Capability | Phase 7 result |
|---|---|
| Customer permission | Explicit account setting, off by default and reversible at any time |
| Provider confirmation | Separate read-only exact-message dialog; no send from create or edit |
| Send-time checks | Active provider, sole-pilot membership, lifecycle entitlement, private flags, current relationship, customer opt-in, relationship restrictions, and exact draft body |
| Delivery | Exactly one ordinary OlogyCrew in-app message in the existing direct conversation |
| Draft history | Sent state, message link, approving provider user, approval time, and sent time |
| External channels | No email, SMS, push notification, campaign, or external delivery call |

## Customer permission

The established notification settings page now includes **Provider relationship messages** above the channel controls. The switch defaults off when a preference row does not exist. Its copy explains that opting in permits occasional in-app follow-ups only from providers with an OlogyCrew relationship, does not enable marketing email, SMS, or push, and can be disabled again at any time.[3] [4]

Global customer permission always takes precedence. A relationship preference may block one provider or mark the contact do-not-contact, but it cannot expand a global opt-out. The send repository evaluates this precedence again inside the same transaction that creates the message.[2] [5]

## Authorization and exactly-once delivery

The send procedure accepts only `contactId`, `draftId`, the exact confirmed draft body, and a literal confirmation. Provider, sender, customer, recipient, and conversation identity are derived from the authenticated session and provider-scoped records. No client provider, sender, or recipient ID is accepted.[1]

The transaction locks both the relationship and draft rows. A discarded draft, archived relationship, deleted customer, inactive or mismatched provider, current opt-out, relationship restriction, do-not-contact marker, or changed draft body prevents the insert. When allowed, the transaction inserts one row into the existing `messages` table and marks the draft sent with the resulting message ID. Concurrent or later retries return the original message instead of creating another one.[2]

After a new commit, the existing Customers projection queue creates only allow-listed message metadata in the relationship timeline. The private message body is not copied into activity. The send path does not invoke the existing general-message notification helper, demo auto-reply, email, SMS, push, owner notification, or any automation system.[1] [2]

## Provider experience

The Message drafts area now displays normalized availability rather than private preference internals. It shows whether confirmed sending is enabled, whether the customer currently permits a relationship message, or whether the relationship is unavailable. Permission is explicitly described as provisional because it is checked again when the provider confirms Send.[6]

Active drafts retain Edit and Discard. Eligible drafts add **Review & send**. The confirmation dialog shows the exact message body and states that one in-app message will be sent with no email, text, push, or automatic follow-up. Sent drafts become immutable, display their sent date, and link to the existing direct conversation.[6]

## Validation

| Validation gate | Result |
|---|---|
| Focused Customers send, real-database atomicity, customer preference, source-contract, and TypeScript gate | 5 files and 92 tests passed |
| Adjacent Customers, projection, entitlement, deletion, provider workspace, payment gate, existing messaging, preferences, and inactive-provider matrix | 21 files and 188 tests passed |
| Real-database concurrency | Two simultaneous sends produced one message ID, one inserted message, and one retry result |
| Side-effect check | The sent-message test created zero notification rows and invoked no external provider |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed; the existing large-chunk advisory remains non-blocking |
| Desktop review | Customer opt-in and enabled provider consent-required state reviewed with the authenticated pilot session |
| Mobile review | Both surfaces reviewed at 390 × 844 with controls in-bounds and no horizontal overflow |

Vitest continues to print the known process-close timeout after successful suites because an existing open handle prevents immediate process exit. All assertions passed. One adjacent audit initially timed out while an old test attempted a live Twilio request; the test was corrected to simulate an unavailable client locally, and the full 188-test matrix then passed without outbound SMS.[7]

Fresh application requests returned successfully. The development logs contained only normal SSE lifecycle entries and existing static-asset Open Graph lookups; no draft mutation, message send, or application error occurred during visual review.

## Final private state

| Private state | Verified value |
|---|---|
| Pilot providers | `[1]` only |
| Provider | Chisolm Audio, active |
| Qualified relationships | 2 |
| Provider self-contacts | 0 |
| Existing activity events | 11 |
| Pilot customers currently opted in | 0 of 2 |
| Notes / tasks / drafts | 0 / 0 / 0 |
| Sent-draft message links | 0 |
| Automation runs | 0 |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersDraftSending` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |
| Audited send-enable changes | 1 |

No real customer message was sent during implementation or review. Because neither pilot relationship customer has opted in, the provider UI currently allows private drafting but correctly blocks sending. AI generation, recommendations, automatic drafting, bulk sending, campaigns, rules, schedules, saved segments, exports, repair jobs, and broader provider rollout remain disabled.

## References

[1]: ../../server/customersRouter.ts "Private Customers access and send API"
[2]: ../../server/db/crm/drafts.ts "Provider-scoped draft and atomic send repository"
[3]: ../../server/routers/notificationRouter.ts "Authenticated notification preference API"
[4]: ../../client/src/pages/NotificationSettings.tsx "Customer relationship-message permission control"
[5]: ../../server/crm/policies.ts "Relationship message consent precedence"
[6]: ../../client/src/pages/ProviderCustomerDetail.tsx "Relationship draft review, confirmation, and sent history"
[7]: ../../server/phase12.test.ts "Side-effect-free notification preference test suite"

# Customers Phase 4 Implementation Report

## Executive summary

Customers Phase 4 adds only **provider-private notes** and **manually created and managed follow-up tasks** for Chisolm Audio, provider 1, as the sole private pilot. Existing bookings, quotes, invoices, payments, messages, and reviews remain authoritative. No customer communication or automated action was introduced.

| Capability | Phase 4 result |
|---|---|
| Private notes | Create and list on a provider-owned relationship; 5,000-character maximum; never copied into activity |
| Manual follow-ups | Create, edit, complete, reopen, and cancel; optional private details and optional future due date |
| Follow-ups workspace | Overdue, due today, upcoming/open, completed, and cancelled groups |
| Activity history | Safe task-created, task-completed, and task-cancelled summaries without note or description content |
| Rollout | Provider 1 only through private pilot membership plus lifecycle entitlements and audited operational flags |
| Excluded capabilities | Drafts, sending, recommendations, rules, schedules, saved segments, exports, and broader rollout |

## Server behavior and isolation

All mutations derive provider ownership from the authenticated user. They require an active provider, private pilot membership, the private Customers read and provider-write flags, and the correct lifecycle-aware entitlement. Constructed provider IDs are not accepted. Contact and task IDs are checked against both the authenticated provider and the target relationship.

Private notes are returned only when the current provider lifecycle grants `crmNotes`. Follow-up rows are returned only when it grants `crmFollowUps`. If a paid entitlement ends, existing private records remain retained but are not returned through the provider API until access is restored.

Manual follow-up creation accepts only `manual_follow_up`. Caller-generated UUID request IDs are converted to provider-scoped dedupe keys. Reusing a request on the same relationship returns the original task without changing its title or state; reusing it against another relationship is rejected. Open-task counts refresh after create, complete, reopen, and cancel. Repeating an already-satisfied state transition is a no-op and does not duplicate activity history.

Task event append is intentionally non-blocking after the task has been safely stored. Any append error logs only provider, task, event type, and error message—never private descriptions. Projection-only rebuilds remove only source entity events and preserve provider-authored task events.

## Provider experience

The relationship detail now shows Follow-ups and Notes before the authoritative Activity timeline. The follow-up dialog contains a title, optional private details, and optional due date. It explicitly states that saving does not send an email, text, push notification, or customer message. Notes carry equally direct privacy guidance.

The Follow-ups tab now groups tasks into overdue, due today, upcoming/open, completed, and cancelled. Every task links back to its relationship. The existing provider shell, bottom navigation, role switcher, and four Customers tabs remain intact. During review, the query-string parser was corrected so the selected tab is reactive rather than always rendering Leads. The mobile tab strip was refined to keep **Activity** fully visible at 390 pixels.

## Validation

| Validation gate | Result |
|---|---|
| Focused Phase 4 router and repository tests | 15 tests passed, including real-database tenancy, dedupe, lifecycle, and count transitions |
| Adjacent Customers, entitlement, deletion, provider workspace, payment gate, and inactive-provider matrix | 18 files and 112 tests passed |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed; the existing large-chunk advisory remains non-blocking |
| Desktop review | Customers, Follow-ups, relationship detail, notes, and add-follow-up dialog reviewed with the authenticated Chisolm Audio session |
| Mobile review | Relationship tools and Follow-ups reviewed at 390 × 844; all four tabs are visible and content remains within the viewport |
| Fresh runtime/network logs | Customers access, workspace, and relationship requests returned 200 with exact capability flags; no fresh application errors were found |

Vitest continues to print the known process-close timeout after successful suites because an existing open handle prevents immediate process exit; passing assertions and successful exit status were used for the focused and adjacent gates.

The complete legacy suite was also run. It recorded **1,650 passing tests, 19 skipped tests, and 40 failures across 12 files**. Every failure-bearing file checked independently still fails outside the Phase 4 batch. The failures are unrelated legacy source-contract or fixture expectations, including historical pricing/navigation text, OG fixtures, old provider/search/security source strings, and earlier booking/promo setup. No Customers, entitlement, deletion, inactive-provider, or provider-workspace Phase 4 gate failed, and no unrelated production behavior was weakened to make stale tests pass.

## Final private state

| Private state | Verified value |
|---|---|
| Pilot providers | `[1]` only |
| Provider | Chisolm Audio, active |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |
| `customersDraftSending` | `false` |
| Qualified contacts | 2 |
| Provider self-contacts | 0 |
| Existing source events | 11 |
| Provider-authored notes/tasks created during review | 0 / 0 |
| Audited provider-write rollout updates | 1 |

No scheduled Customers job, provider message, relationship draft, export, saved segment, automated recommendation, or broad-provider access was enabled.

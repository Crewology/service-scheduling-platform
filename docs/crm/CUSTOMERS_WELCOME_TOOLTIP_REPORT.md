# Customers Welcome Tooltip Report

## Executive summary

Eligible providers now receive a concise, one-time **Welcome to Customers** popover when they first open the Customers workspace. The welcome uses the product name Customers, introduces automatically organized provider relationships, explains that private tools follow current provider access, and makes consent-aware in-app messaging explicit. It does not expose customer data or change any Customers record, entitlement, rollout flag, pricing rule, or provider permission.[1] [2]

| Behavior | Result |
|---|---|
| Eligibility | Mounted only after the server confirms Customers is visible for the authenticated provider |
| Scope | Dismissal key is versioned and scoped to the server-derived provider ID |
| Frequency | Opens once per provider and tooltip version in the current browser |
| Actions | Close icon, Learn more, and Got it |
| Blocking | Non-modal; existing navigation and workspace remain available |
| Content safety | No customer name, email, relationship detail, note, task, draft, or message body |

## Provider experience

The popover is anchored to the **Provider-owned relationships** badge in the existing Customers hero. Its three short explanations describe how qualified OlogyCrew activity builds relationships, how notes, follow-ups, stages, and drafts follow the provider’s current access, and how a message sends only after draft review, deliberate confirmation, and current customer permission.[1]

The Learn more action opens the existing Help Center. Selecting Got it or the labeled close control saves the provider-scoped version key and closes the welcome immediately. Reloading the same provider’s Customers workspace does not show it again. A different provider receives a distinct key and therefore sees their own welcome.[1] [3]

## Accessibility and responsive behavior

The welcome uses the established Radix-based Popover component. It renders an accessible dialog named **Welcome to Customers**, provides an explicit **Dismiss Customers welcome** label, supports keyboard interaction through the component library, and preserves visible focus behavior.[1] [4]

Desktop review at 1280 × 900 confirmed readable hierarchy, complete actions, and unobstructed workspace navigation. Mobile review at 390 × 844 confirmed in-bounds content, stacked actions, and no horizontal overflow. The existing install-app banner may remain visible beneath the welcome but does not cover its controls.

## Persistence design

No database or schema change was required. Dismissal is stored locally under:

`ologycrew:customers-welcome:v1:provider:<providerId>`

The provider ID is returned only after authenticated, server-derived Customers access resolution. The `v1` segment permits a future, materially different release welcome without resetting unrelated browser state or conflating providers.[2] [3]

## Files changed

| File | Change |
|---|---|
| `client/src/components/customers/CustomersWelcomePopover.tsx` | Accessible welcome presentation, dismissal behavior, and Help Center action |
| `client/src/lib/customersWelcome.ts` | Versioned provider-scoped persistence key |
| `client/src/pages/ProviderCustomers.tsx` | Eligible-workspace anchor and welcome integration |
| `server/customersRouter.ts` | Adds the already authorized provider ID to the private access response for persistence scope |
| `server/customers-welcome.test.ts` | Rendered accessibility, eligibility, persistence, and content-safety regressions |
| `server/customers-phase3.test.ts` | Updated workspace source contract for the reusable welcome component |
| `todo.md` | Implementation tracking |

## Validation

| Gate | Result |
|---|---|
| Rendered welcome and adjacent Customers regressions | **10 files and 101 tests passed** |
| Focused post-refactor rerun | 2 files and 16 tests passed |
| Interactive dismissal | Got it closes immediately; same-provider reload does not repeat |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed |
| Desktop review | Passed at 1280 × 900 |
| Mobile review | Passed at 390 × 844 |

Vitest continues to report the known process-close timeout after passing assertions because an existing open handle delays exit. The production build continues to report the existing large-bundle advisory. Development logs also contain the previously documented managed Vite WebSocket reconnect warning. A one-time Fast Refresh invalidation occurred when non-component exports were moved out of the new component; the final component now exports only React UI, and no application error resulted.

## Intentionally unchanged

Customers remains lifecycle-entitlement gated and provider scoped. Starter, Pro, and Business access behavior is unchanged. Provider relationships, notes, follow-ups, stages, drafts, confirmed sending, consent, projection, aggregate administration, named-admin policy, prices, public plan copy, and rollout state are unchanged. AI, recommendations, automation execution, schedules, saved segments, exports, bulk messaging, external CRM, manual contacts, and repair jobs remain disabled.

## References

[1]: ../../client/src/components/customers/CustomersWelcomePopover.tsx "Customers welcome component"
[2]: ../../server/customersRouter.ts "Authenticated Customers access response"
[3]: ../../client/src/lib/customersWelcome.ts "Versioned provider-scoped welcome persistence"
[4]: ../../client/src/components/ui/popover.tsx "Established accessible popover primitive"


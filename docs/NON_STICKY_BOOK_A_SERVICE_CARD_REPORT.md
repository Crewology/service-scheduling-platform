# Non-Sticky Book a Service Card Update

**Status:** Complete  
**Date:** September 10, 2026  
**Database changes:** None

## Summary

The public provider profile’s **Book a Service** card no longer uses sticky positioning. It now remains in normal document flow on both mobile and desktop, so it scrolls away with the rest of the profile rather than staying pinned to the viewport.

## Implementation

| Area | Change |
|---|---|
| Provider profile | Removed `sticky top-4` from the Book a Service card. |
| Regression protection | Added a stable test identifier and a source contract that rejects `sticky` or positional top classes on that card. |
| Preserved UI | Retained the card’s content, action order, responsive widths, CTA labels, service links, quote dialog, payment-method row, and message action. |

## Files changed

| File | Purpose |
|---|---|
| `client/src/pages/PublicProviderProfile.tsx` | Keeps the Book a Service card in normal document flow. |
| `server/adaptive-booking-integration.test.ts` | Prevents sticky positioning from returning to the card. |
| `docs/NON_STICKY_BOOK_A_SERVICE_CARD_REPORT.md` | Records implementation, validation, and unchanged behavior. |
| `todo.md` | Tracks the update through completion. |

## Validation

| Gate | Result |
|---|---|
| Focused regression | **1 file and 18 tests passed.** |
| Adjacent release gate | **7 files and 80 tests passed.** |
| TypeScript | **Passed with zero errors.** |
| Diff validation | **`git diff --check` passed.** |
| Production build | **Passed in 30.01 seconds.** |
| Desktop interaction | Scrolling beyond the Book a Service card removed it from the viewport while later profile sections remained in their normal order. |
| Mobile review | At 390 × 844, the card remained between All Services and Business Details with unchanged spacing and unclipped actions. |
| Runtime review | No current provider-profile, navigation, layout, or asset error appeared during review. |

Vitest reported its known post-completion close timeout after all assertions passed. The production build retained the existing large-chunk advisory. Neither warning caused a test, type, diff, or build failure.

## Intentionally unchanged

No header, service card, CTA behavior, adaptive route, quote submission, message action, payment display, provider data, booking data, pricing, database record, Customers entitlement, tenant boundary, or paused cleanup work changed. Other intentionally sticky elements elsewhere in the application remain unchanged.

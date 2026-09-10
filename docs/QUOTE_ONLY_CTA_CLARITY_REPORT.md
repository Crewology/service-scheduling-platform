# Quote-Only CTA Clarity Update

**Status:** Complete  
**Date:** September 10, 2026  
**Database changes:** None

## Summary

Quote-only service action buttons now use the explicit label **View Service & Request Quote**. The wording appears on the one-service provider-profile primary action and on quote-only search-result actions. Directly bookable services retain their existing **Browse & Book** or **Check availability** labels.

The text is selected by the same adaptive booking decision that determines whether the destination presents scheduling or a guided quote request. The action destination and provider context are unchanged.

## Behavior

| Surface and service state | CTA label |
|---|---|
| One-service provider profile, quote-only | **View Service & Request Quote** |
| One-service provider profile, directly bookable | **Browse & Book** |
| Multi-service provider profile | **Browse & Book** |
| Search result, quote-only | **View Service & Request Quote** |
| Search result, directly bookable | **Check availability** |
| Generic provider-level quote dialog | **Request a Quote** — unchanged |

## Files changed

| File | Purpose |
|---|---|
| `shared/adaptiveBooking.ts` | Added the shared decision-aware service CTA label helper. |
| `client/src/pages/PublicProviderProfile.tsx` | Applies quote-only copy to the one-service primary action and permits safe mobile wrapping. |
| `client/src/pages/Search.tsx` | Applies the same quote-only copy to service-result actions and permits safe mobile wrapping. |
| `server/adaptive-booking-integration.test.ts` | Covers quote-only labels, preserved direct labels, shared integration, and responsive classes. |
| `docs/QUOTE_ONLY_CTA_CLARITY_REPORT.md` | Records implementation, validation, and unchanged behavior. |
| `todo.md` | Tracks the update through completion. |

## Validation

| Gate | Result |
|---|---|
| Focused regression | **1 file and 17 tests passed.** |
| Adjacent release gate | **7 files and 79 tests passed.** |
| TypeScript | **Passed with zero errors.** |
| Diff validation | **`git diff --check` passed.** |
| Production build | **Passed in 30.69 seconds.** |
| Desktop review | Gary Studios and Studio Blocks search both displayed the complete quote-only label without clipping. |
| Mobile review | At 390 × 844, provider-profile and search-result actions displayed the complete label without overflow or truncation. |
| Direct-service control | The A1 search result retained **Check availability** on mobile. |
| Runtime review | No current CTA, profile, search, navigation, or asset error appeared during responsive review. |

Vitest reported its known post-completion close timeout after all assertions passed. The production build retained the existing large-chunk advisory. Neither warning caused a test, type, diff, or build failure.

## Intentionally unchanged

No service card badge, pricing, adaptive decision, service destination, provider context, booking flow, quote submission, payment behavior, database record, Customers entitlement, tenant boundary, or paused cleanup work changed. **Request a Quote** remains the generic provider-level custom quote action because it is not a quote-only service entry button.

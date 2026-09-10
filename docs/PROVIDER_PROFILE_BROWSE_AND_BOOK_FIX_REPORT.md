# Provider Profile Browse & Book Fix

**Status:** Complete  
**Date:** September 10, 2026  
**Database changes:** None

## Summary

The **Browse & Book** button on public provider profiles only called `scrollIntoView()` for the services section. On a one-service mobile profile such as Gary Studios, that section already appeared above the button, so the click did not open a booking or quote flow and appeared non-responsive.

The action now adapts to the provider’s service count. A one-service profile opens that service’s existing adaptive route immediately. A multi-service profile continues to scroll to the service list so the customer can choose. Empty input returns a safe unavailable state with visible error feedback.

## Behavior

| Provider profile state | Browse & Book result |
|---|---|
| One directly bookable service | Opens the service page and its date/time booking flow. |
| One quote-based service | Opens the service page and its guided quote-request flow. |
| Multiple services | Scrolls to the provider’s service list for selection. |
| No services | Returns a safe unavailable state; the existing card does not render its booking controls. |

Gary Studios currently has one active Studio Blocks service without a configured bookable price. Its adaptive destination therefore correctly shows **Contact for pricing** and the guided **Send quote request** flow. The separate provider-level **Request a Quote** button still opens its existing custom quote dialog.

## Files changed

| File | Purpose |
|---|---|
| `shared/adaptiveBooking.ts` | Added a deterministic provider-profile Browse & Book action resolver. |
| `client/src/pages/PublicProviderProfile.tsx` | Uses the resolver to navigate for one service, scroll for multiple services, and show fallback feedback. |
| `server/adaptive-booking-integration.test.ts` | Covers direct, quote, multi-service, empty-state, and component wiring behavior. |
| `docs/PROVIDER_PROFILE_BROWSE_AND_BOOK_FIX_REPORT.md` | Records diagnosis, implementation, validation, and unchanged behavior. |
| `todo.md` | Tracks the bug through completion. |

## Validation

| Gate | Result |
|---|---|
| Focused regression | **1 file and 15 tests passed.** |
| Adjacent release gate | **7 files and 77 tests passed.** |
| TypeScript | **Passed with zero errors.** |
| Diff validation | **`git diff --check` passed.** |
| Production build | **Passed in 30.73 seconds.** |
| Desktop interaction | Gary Studios **Browse & Book** navigated to `/service/1710001?entry=adaptive&from_provider=gary-studios-1350001`. |
| Adjacent quote action | **Request a Quote** continued to open the existing custom quote dialog; no request was submitted. |
| Mobile review | The provider profile and guided Studio Blocks quote destination rendered without clipping at 390 × 844. |
| Runtime review | Profile, service, and adaptive-flow requests completed without a current client navigation, service-page, or asset error. |

Vitest reported the known post-completion close timeout after all assertions passed. The production build retained the existing large-chunk advisory. Neither warning caused a test, type, diff, or build failure.

## Intentionally unchanged

No provider, service, pricing, availability, booking, quote, payment, subscription, or database record changed. The service cards and service-detail adaptive decision remain authoritative. The fix does not alter quote submission authorization, login behavior, Customers entitlements, provider isolation, payment logic, or the paused production cleanup work.

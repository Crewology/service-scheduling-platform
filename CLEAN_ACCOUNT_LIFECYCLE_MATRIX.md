# OlogyCrew Clean-Account Lifecycle Matrix

**Author:** Manus AI  
**Status:** Completed and validated  
**Scope:** Customer, provider, marketplace, booking, quote, payment, subscription, trust, notification, administration, and responsive lifecycle validation.

## Safety and Isolation Strategy

Clean-account tests must validate production contracts without creating public marketplace supply or fabricated customer sentiment. Database-backed identities use an unmistakable `test-clean-lifecycle-<run-id>` prefix and non-deliverable `@example.invalid` addresses. Any provider created by a test remains inactive and receives no public evidence badges. Tests must not send real email, SMS, push, social posts, Stripe charges, partner transfers, or webhook requests; external delivery and Stripe behavior use deterministic mocks or fixtures.

Reviews are tested only for authorization and booking provenance. A database-backed review may exist briefly only for an inactive test provider and must be removed by the same test run. No test review, rating, or testimonial may be displayed in discovery or retained after cleanup. Every database-backed suite must use `try/finally` or global cleanup and verify that its prefixed users, providers, services, bookings, messages, quotes, reviews, subscriptions, and notifications are removed.

| Isolation Control | Required Behavior | Verification |
|---|---|---|
| Test identities | Prefix all `openId`, names, slugs, booking numbers, and emails with `test-clean-lifecycle-<run-id>` | Post-run database query returns zero matching users/providers |
| Provider visibility | Keep provider `isActive=false`; never include it in spotlight, featured, or discovery results | Search and featured queries exclude the identity |
| Reviews and ratings | Use only a completed test booking; keep provider inactive; delete the review and dependent records | No prefixed reviews remain; public review count is unchanged |
| Payments | Mock Stripe subscriptions, Checkout, Connect, refunds, invoices, and transfers | No real Checkout URL, PaymentIntent, invoice, transfer, or charge is created |
| Communications | Mock email/SMS/push providers; inspect payload semantics only | No external recipient is contacted |
| Verification evidence | Use resolver fixtures or private test records; never upload personal documents | No public evidence badge or retained test artifact |
| Cleanup | Delete dependents from leaf to root and verify absence | Cleanup assertion runs even when a journey fails |

## Customer Lifecycle

| Journey | Expected Outcome | Evidence Route | Status |
|---|---|---|---|
| Account creation and email authentication | New account is unique, authenticated, and has no accidental provider role | Database-backed auth/role suite | Passed; delivery mocked |
| Logged-out plan selection | Selected Individual, Coordinator, or Manager intent survives authentication and activates the correct account path | Login/onboarding contract suite | Passed |
| Customer role selection | Role persists without a second role prompt or page flash | Role-selection and redirect suites | Corrected stale fixtures; passed |
| Optional two-factor authentication | Enrollment enables only after code delivery; failed delivery cannot lock the account; disable clears trusted devices | Two-factor enrollment and cleanup suites | Corrected and passed |
| Individual access | Core discovery, booking, messaging, quotes, reviews, and five saved providers remain available; paid-only folders, bulk quotes, analytics, and exports remain blocked | Entitlement and gate suites | Passed |
| Coordinator access | Fifty saves and folders are available; Manager-only bulk quotes, analytics, and exports remain blocked | Entitlement and gate suites | Passed |
| Manager access | Unlimited saves, bulk quotes, analytics, and exports are available | Entitlement, bulk quote, export, and reporting suites | Passed |
| Discovery and service entry | Need, location, and timing context persists; direct or quote mode is selected deterministically | Adaptive booking integration suite | Passed |
| Standard booking | Fixed, hourly, package, consultation, and free services use direct booking | Adaptive and booking suites | Passed |
| Complex service request | Custom, incomplete-price, or incomplete-duration service uses a guided quote | Adaptive and quote suites | Passed |
| Multi-day and recurring | Eligible services retain specialized schedule semantics and session controls | Booking/session suites | Passed |
| Messaging | Only conversation or booking participants can read and send messages; attachments are validated | Message router suite | Passed; delivery mocked |
| Completion and review | Review is allowed only after an OlogyCrew booking is completed and only once | Review provenance suite | Passed without persisted rating |
| Rebooking | Completed service opens the same live service with preserved provider and adaptive mode | Customer-home and adaptive suites | Passed |

## Provider Lifecycle

| Journey | Expected Outcome | Evidence Route | Status |
|---|---|---|---|
| Provider plan selection and signup | Selected Starter or Pro-trial intent survives authentication and activates once | Plan/onboarding contract suite | Passed |
| Provider role and profile | Provider role is assigned once; profile persists across logout; duplicate profiles are rejected | Provider-role and hidden clean-account suites | Passed |
| Onboarding | Plan, profile, categories, services, and optional Get Paid steps retain state and progress consistently | Onboarding suites | Passed |
| Category/service limits | Starter, Pro, Business, and valid trial limits use the shared entitlement catalog | Entitlement and service/category gate suites | Passed |
| Availability | Weekly schedule, overrides, conflicts, multi-day, and recurring eligibility are preserved | Availability and booking suites | Corrected date fixture; passed |
| Public page | Inactive clean test provider is not discoverable; active production providers expose no billing or private verification data | Public-profile and trust contract suites | Corrected inactive-provider boundary; passed |
| Booking and quote response | Provider can accept/decline owned bookings and respond only to owned quote requests | Booking and quote authorization suites | Corrected status authorization; passed |
| Payment collection | Starter cannot collect even with a retained account; paid tier also requires payout-ready Connect state | Booking payment and Stripe Connect suites | Passed with Stripe mocked |
| Invoicing | Starter is blocked; effective Pro/Business access is required | Invoice entitlement and invoice suites | Passed with delivery/storage mocked |
| Completion | Provider completion updates customer review eligibility and OlogyCrew activity provenance | Booking/review suites | Passed; communications mocked |

## Billing and Subscription Lifecycle

| State or Transition | Provider Expected Outcome | Customer Expected Outcome | Status |
|---|---|---|---|
| Free | Starter has booking/quote management but no payment collection or invoices | Individual has core booking and limited saves | Passed |
| Trial | Fourteen-day Pro access applies only while current; no card is required | Customer trial behavior follows configured plan contract | Passed |
| Upgrade | Existing live subscription changes in place and clears scheduled cancellation | Coordinator/Manager change occurs in place | Passed with Stripe mocked |
| Paid-to-free downgrade | Paid access remains through current period; no immediate duplicate credit/charge loop | Same end-of-period behavior | Passed with Stripe mocked |
| Reactivation before period end | Scheduled cancellation is removed with no Checkout and no new charge | Same no-charge reversal | Passed with Stripe mocked |
| Interval change | Existing subscription changes price/interval in place and clears cancellation | Same in-place change | Passed with Stripe mocked |
| Renewal | Period dates advance, active access remains, billing history and notifications reconcile | Same lifecycle semantics | Passed with Stripe fixtures |
| Payment failure | Bounded past-due grace uses the authoritative period end; absent/expired grace suspends paid capability | Same lifecycle semantics | Passed with Stripe fixtures |
| Pause | Paused lifecycle denies paid capabilities unless explicitly documented otherwise | Same resolver semantics | Passed |
| Terminal cancellation | Effective access becomes Starter or Individual after the paid period ends | Same terminal transition | Passed |
| Refund | Booking cancellation refunds only captured funds, including partial deposits; free/unpaid bookings return zero | Same separation | Corrected and passed without real refunds |
| Duplicate-charge protection | No second subscription or Checkout is created for a live or scheduled-cancellation subscription | Same protection | Passed with Stripe mocked |
| Partner split | Eligible collected revenue remains 60% OlogyCrew and 40% Visionkwest; transfer is idempotent by source transaction | Not applicable | Passed with Stripe mocked |

## Trust, Administration, and Responsive Behavior

| Journey | Expected Outcome | Evidence Route | Status |
|---|---|---|---|
| Evidence submission | Upload is Pending, private, metadata-rich, and immutable after review | Verification workflow suite | Passed |
| Admin review | Approval/rejection/revocation is evidence-specific, reasoned, audited, and provider-notified | Verification workflow suite | Passed; delivery mocked |
| Expiry | Current evidence becomes Expired at the correct time and public signal disappears | Trust resolver suite | Passed |
| Public trust | Evidence, completed OlogyCrew bookings, booking-linked reviews, and standing remain separate | Trust contract and visual review | Passed |
| Demo suppression | Official demos never publish verification, ratings, reviews, or completed-work claims | Trust resolver and public contract suite | Passed |
| Admin reporting | Effective plan, billing action, MRR, revenue, failed/deferred partner share, and transfer totals agree | Admin reporting and partner split suites | Passed |
| Notifications | Booking, quote, message, subscription, payment, and verification notices use correct audience and action links | Notification suites | Passed; external delivery mocked |
| Role switching | Provider/customer mode opens the correct approved home without flash or stale route | Navigation contract and visual review | Passed |
| Responsive UI | Customer home, provider workspace, booking, subscription, billing history, public trust, and admin evidence review remain readable on desktop and mobile | Screenshot review | Passed |

## Corrected Findings

| Finding | Correction | Verification |
|---|---|---|
| Test accounts could leave authentication, subscription, folder, invoice, audit, and push records | Expanded leaf-to-root global cleanup and post-cleanup assertions | Database-backed cleanup regression |
| Inactive providers remained reachable through some direct and agent API routes | Added active-provider checks to public provider, service, booking, and agent boundaries | Inactive-provider boundary suite |
| Explicit price filters treated quote-only or missing prices as zero | Excluded services without numeric prices whenever a price range is supplied | Search regression suite |
| Cancellation refunds were based on total booking value, including unpaid balances | Refund base now uses remaining captured payment only | Cancellation refund suite |
| Customers could call the provider status mutation to self-confirm, complete, refund, or bypass cancellation policy | Restricted status changes to owning providers or administrators | Booking status authorization suite |
| Failed 2FA email delivery could leave the login requirement enabled | Enable 2FA only after successful code delivery | Two-factor enrollment suite |
| Several legacy tests expected old navigation, cookie, SSE, and email-verification behavior | Updated fixtures and contracts without weakening production controls | Two clean-account matrix reruns |
| Database-backed tests attempted real welcome and account-deletion email delivery | Mocked all external communication delivery in the clean-account execution path | Clean reruns with non-deliverable identities |

## Execution Rules

Each row is marked **Passed**, **Failed**, **Corrected and Passed**, **Blocked by External Environment**, or **Not Applicable** only after deterministic evidence exists. A source-contract test is acceptable for route wiring and copy invariants; authorization and lifecycle transitions require unit, router, or database-backed execution. Real money and production messaging are never used for test coverage. Any failure becomes a tracked defect before correction, and every affected row is rerun after the fix.

## Final Validation Evidence

| Validation | Result |
|---|---|
| Combined lifecycle regression | 49 test files passed; 604 tests passed |
| TypeScript | Zero errors with `tsc --noEmit` |
| Production build | Successful Vite and server bundle build |
| Desktop visual review | Customer/provider plans, billing histories, public trust, provider workspace, pricing, and admin evidence review rendered cleanly |
| Mobile visual review | The same core release surfaces remained readable at 390 × 844 |
| Runtime review | No fresh browser, API, React, or server errors from the final visual pass |
| Database cleanup | Reserved test records removed; legitimate deleted-user aliases and unrelated example.com accounts explicitly preserved |
| External side effects | Stripe, email, SMS, push, social publishing, and partner transfers were mocked or contract-tested; no real charges or external messages were created |

Vitest continues to report the project’s known process-close timeout after tests have already passed and teardown has completed. The final test assertions, cleanup verification, TypeScript check, and build all completed successfully.

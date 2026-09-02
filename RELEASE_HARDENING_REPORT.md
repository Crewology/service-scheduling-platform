# OlogyCrew Release Hardening Report

**Author:** Manus AI  
**Date:** September 2, 2026  
**Status:** Implementation and automated validation complete; owner acceptance testing and publishing remain.

## Executive Summary

OlogyCrew now uses one authoritative entitlement model for provider and customer plans, one evidence-based provider trust taxonomy, and one documented clean-account lifecycle matrix. The approved provider Overview, need-first customer home, and adaptive direct-booking versus quote-request experiences remain in place.

The release-hardening program closed subscription contradictions, duplicate-charge risks, retained-Stripe payment loopholes, inaccurate admin revenue reporting, blanket provider verification claims, inactive-provider exposure, unsafe test teardown, booking refund errors, booking-status authorization escalation, and two-factor enrollment lockout risk. Final validation completed with **49 test files and 604 passing tests**, zero TypeScript errors, a successful production build, responsive desktop/mobile review, and no fresh runtime errors during the final visual pass.

## Authoritative Subscription and Billing Model

The shared provider and customer plan catalogs, lifecycle resolver, prices, limits, and capability helpers in [`shared/entitlements.ts`](./shared/entitlements.ts) are authoritative. Compatibility modules now consume that source instead of maintaining conflicting plan rules. The full intended behavior is documented in the [Entitlement Model][1].

| Area | Release Behavior |
|---|---|
| Provider plans | Starter is free; Pro is $12/month; Business is $20/month. Annual pricing remains normalized through the shared catalog. |
| Customer plans | Individual is free; Coordinator is $12/month; Manager is $20/month. |
| Trial | A single 14-day trial uses lifecycle-aware access rather than raw subscription fields. |
| Starter payments | Starter providers may receive bookings and quote requests but cannot collect platform payments, create invoices, or begin new Stripe onboarding. |
| Retained Stripe account | Downgrade preserves the connected Stripe account for operational access and painless reactivation, while payment collection remains disabled by entitlement. |
| Paid-to-free downgrade | Paid access remains active through the already-paid billing period. Cancellation is scheduled for period end. |
| Reactivation | Selecting the same plan and interval before period end removes scheduled cancellation without creating a Checkout Session or new charge. |
| Upgrade or interval switch | The existing live Stripe subscription changes in place and clears scheduled cancellation. |
| Suspended billing | Paused, incomplete, terminally cancelled, and expired states deny paid capabilities. Past-due access is limited to the documented bounded grace period. |
| Booking checkout | A real payment requires both effective provider payment entitlement and a payout-ready connected account. Official demo behavior remains narrowly isolated. |
| Billing communication | Email, in-app notifications, billing history, and current-plan UI use the same state, action requirement, and access-end date. |

Admin subscription KPIs now separate effective paid access from revenue-generating subscriptions, include provider and customer recurring revenue, normalize annual plans to monthly revenue, and distinguish trials, grace periods, scheduled cancellation, administrative grants, and suspended access.

The contractual partner allocation remains **60% OlogyCrew LLC / Gary and 40% Visionkwest Media / Winston**. Transfers continue to use `source_transaction` and the connected Visionkwest account `acct_1U6HO6C4LbrPtrS5`. Reporting is idempotent by revenue source and separates gross revenue, actual partner transfers, deferred sub-minimum amounts, failures, and unresolved obligations.

## Evidence-Based Provider Trust

Provider trust is no longer represented by one unexplained “verified” flag. The implemented taxonomy separates reviewed evidence, platform activity, booking-linked customer feedback, and automated provider standing. The complete state model, labels, privacy rules, expiry rules, and demo safeguards are documented in the [Provider Trust Taxonomy][2].

| Signal | Meaning |
|---|---|
| Identity reviewed | An administrator approved current identity evidence. |
| Business reviewed | An administrator approved current business-registration evidence. |
| Professional license reviewed | An administrator approved current license evidence with issuer, credential, jurisdiction, and expiry metadata where applicable. |
| Insurance reviewed | An administrator approved current insurance evidence that has not expired or been revoked. |
| Background check reviewed | An administrator approved a current background-check record; this does not imply a permanent guarantee. |
| OlogyCrew completed work | A factual count of completed bookings processed through OlogyCrew. |
| Booking-linked reviews | Feedback is accepted only from the customer on a completed OlogyCrew booking, once per booking. |
| Provider standing | A non-verification behavioral/profile signal; labels no longer imply credential verification. |

New evidence submissions are private, metadata-rich, Pending by default, and retained as immutable history after review. Administrators review each evidence record independently, must supply rejection or revocation reasons, and create audit records. Expiry and revocation remove the public signal. Providers receive evidence-specific in-app decisions. Protected document links are short-lived, and public API/profile responses do not expose document locations or private evidence identifiers.

Official demo providers publish no evidence badge, completed-work claim, rating, or booking-linked review signal as marketplace trust. Legacy blanket provider verification mutations are blocked at the server boundary.

## Clean-Account Lifecycle Matrix

The [Clean-Account Lifecycle Matrix][3] covers customer and provider authentication, role selection, cross-device plan persistence, onboarding, discovery, direct and quote booking, availability, multi-day and recurring service behavior, messaging, completion, review provenance, rebooking, subscriptions, Stripe gating, invoicing, cancellation, refunds, notifications, administration, trust, and responsive UI.

Tests used unmistakable reserved identities and non-deliverable addresses. Providers remained inactive when database-backed visibility checks were required. Stripe, SendGrid, SMS, push, owner alerts, social publishing, and partner transfers were mocked or contract-tested. No fabricated public review, retained rating, real charge, real refund, or external message was created.

| Validation | Result |
|---|---|
| Combined regression | 49 test files passed; 604 tests passed |
| TypeScript | Zero errors with `tsc --noEmit` |
| Production build | Successful Vite client and server bundle |
| Desktop review | Provider/customer subscription and billing, pricing, provider workspace, public trust, and admin evidence review rendered cleanly |
| Mobile review | Core release surfaces remained readable at 390 × 844 |
| Runtime review | No fresh browser, API, React, or server errors from the final review |
| Cleanup review | Reserved test records were deleted; legitimate deleted-user aliases and unrelated example.com records were explicitly preserved |

Vitest continues to emit the known process-close timeout after passing assertions and successful database teardown. This is an open-handle shutdown condition, not a failed test assertion; TypeScript, build, cleanup, and all 604 assertions completed successfully.

## Defects Corrected During Lifecycle Execution

| Finding | Correction |
|---|---|
| Inactive providers were reachable through selected direct and agent API paths | Public provider, service, booking, and agent boundaries now enforce active-provider visibility. |
| Explicit price ranges treated quote-only or missing prices as zero | Numeric filters now exclude services without a numeric price. |
| Test teardown could leave dependent data | Cleanup now removes subscriptions, sessions, favorites, folders, invoices, audit entries, authentication factors, push records, services, bookings, messages, notifications, and reviews in dependency order. |
| Cleanup matching was too broad | Teardown now uses only explicit reserved test namespaces and `example.invalid`; it does not target deleted-user aliases, display names, or ordinary example.com addresses. |
| Cancellation refunds used full booking value | Refunds now use only remaining captured funds, including partial deposits; free and unpaid bookings return zero. |
| Customers could call the provider booking-status mutation | Only the owning provider or an administrator can confirm, progress, complete, refund, or directly cancel through that mutation. Customers use the policy-aware cancellation route. |
| Failed 2FA code delivery could enable the login requirement | Two-factor authentication is enabled only after code delivery succeeds; failures leave the account disabled with a clear error. |
| Database-backed tests attempted external email delivery | Clean-account tests now mock welcome, deletion, and lifecycle communication delivery. |
| Legacy tests encoded retired routes and security assumptions | Cookie, verified-email, onboarding, navigation, SSE, entitlement privacy, availability-date, and verification expectations were updated without weakening production controls. |

## Owner Acceptance Checks After Publishing

Automated validation intentionally avoided real external transactions. After publishing this checkpoint, complete the following checks on the deployed `ologycrew.com` domain:

| Check | Expected Result |
|---|---|
| Provider downgrade and reactivation | Downgrade Pro to Starter, confirm the paid access-end date, then select **Keep Current Plan** before period end. Stripe should remove scheduled cancellation without a new charge. |
| Starter payment gate | A Starter provider may receive a booking or quote but cannot start Stripe onboarding, invoice, or collect a platform payment. |
| Paid provider checkout | Use the production-domain payment test promo-code process available in Settings → Payment. Confirm a payout-ready paid provider can complete Checkout. |
| Partner transfer | Confirm the eligible transaction reports a 60/40 allocation and the 40% transfer is associated with `acct_1U6HO6C4LbrPtrS5`. |
| Billing failure/recovery | Confirm Stripe webhook processing changes the plan’s billing-action state and sends the correct in-app/email message on failure and restoration. |
| Verification decision | Submit non-sensitive test evidence through a non-public provider account, review it in Admin, then confirm approval/rejection/revocation labels and private access. Remove or revoke the evidence afterward. |
| Optional 2FA | Enable 2FA on an account with a reachable email, receive the code, verify login behavior, then disable it and confirm the trusted-device state clears. |
| Provider/customer switch | Confirm each mode opens the approved Overview or need-first home directly without flashing the wrong role page. |

## Release Checkpoints

| Milestone | Checkpoint |
|---|---|
| Stabilized subscription lifecycle and booking payment boundary | `5b01fd05` |
| Provider/customer feature-gate reconciliation | `40536a2c` |
| Notifications, admin billing, MRR, histories, and partner reporting | `8a909636` |
| Evidence-based provider trust taxonomy | `99e00a30` |
| Clean-account lifecycle and final release hardening | Created with this report |

## References

[1]: ./ENTITLEMENT_MODEL.md "OlogyCrew Authoritative Entitlement Model"
[2]: ./PROVIDER_TRUST_TAXONOMY.md "OlogyCrew Provider Trust and Verification Taxonomy"
[3]: ./CLEAN_ACCOUNT_LIFECYCLE_MATRIX.md "OlogyCrew Clean-Account Lifecycle Matrix"

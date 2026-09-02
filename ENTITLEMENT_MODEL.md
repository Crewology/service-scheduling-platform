# OlogyCrew Authoritative Entitlement Model

## Purpose

This document is the business contract for subscriptions and billing. Code, pricing, onboarding, authorization, Stripe synchronization, notifications, help content, terms, and admin reporting must derive from these rules. A persisted `tier` by itself never proves access; effective access is the result of the plan, lifecycle status, trial/period dates, cancellation state, and billing source.

## Provider plans

| Capability | Starter | Pro | Business |
|---|---:|---:|---:|
| Monthly price | $0 | $12 | $20 |
| Annual price | $0 | $120.96 | $192 |
| Active service categories | 1 | 5 | Effectively unlimited |
| Active services | 3 | 10 | Effectively unlimited |
| Photos per service | 1 | 3 | 5 |
| Public profile | Included | Included | Included |
| Booking management | Included | Included | Included |
| Customer messaging | Included | Included | Included |
| Transactional email | Included | Included | Included |
| Stripe payment collection | Not included | Included | Included |
| Provider invoicing | Not included | Included | Included |
| Custom profile URL | Not included | Included | Included |
| Search priority | Standard | Priority | Top placement |
| Analytics | Not included | Business analytics | Full analytics |
| Custom branding | Not included | Not included | Included |
| Featured listing | Not included | Not included | Included |
| SMS notifications | Not included | Not included | Included |
| Priority support | Not included | Not included | Included |

## Customer plans

| Capability | Individual | Coordinator | Manager |
|---|---:|---:|---:|
| Monthly price | $0 | $12 | $20 |
| Annual price | $0 | $120.96 | $192 |
| Saved providers | 5 | 50 | Unlimited |
| Direct bookings | Included | Included | Included |
| Quote requests | Included | Included | Included |
| Messaging and reviews | Included | Included | Included |
| Priority booking requests | Not included | Included | Included |
| Provider folders | Not included | Included | Included |
| Bulk quote requests | Not included | Not included | Included |
| Booking analytics and exports | Not included | Not included | Included |
| Priority support | Not included | Not included | Included |

## Trial rules

Provider and customer accounts may each use one fourteen-day trial during the lifetime of that audience-specific subscription record. A trial grants the selected paid plan only while `status=trialing` and `trialEndsAt` is in the future. Trial history is retained after expiration so a new trial cannot be created by downgrading, cancelling, logging out, or changing devices. Trial expiration resolves to the audience's free plan and never starts a charge without explicit checkout authorization.

## Effective lifecycle states

| Persisted/billing condition | Effective access | UI state | Required recovery |
|---|---|---|---|
| No row or active free row | Free plan | Current free plan | Optional upgrade |
| Trialing with future `trialEndsAt` | Trial plan | Trial with exact remaining time | Subscribe or continue until expiry |
| Trialing with expired/missing `trialEndsAt` | Free plan | Trial expired | Select a paid checkout or remain free |
| Active paid Stripe subscription | Paid plan | Current paid plan and renewal date | None |
| Active paid administrative grant without Stripe subscription | Paid plan | Current paid plan; no billing controls | Admin-managed |
| Active paid subscription with `cancelAtPeriodEnd=true` and future period end | Paid plan until period end | Cancels on exact date | Reactivate before end or allow expiry |
| `past_due` with a future recorded period end | Paid plan temporarily, with billing warning | Payment needs attention | Update payment method before access end |
| `past_due` without a valid future period end | Free plan | Paid access suspended | Update payment method and reactivate |
| Paused | Free-plan capability access; paid data preserved | Subscription paused | Resume subscription |
| Incomplete | Free plan | Payment not completed | Complete a fresh checkout |
| Cancelled with no valid future access end | Free plan | Cancelled | Start a new paid checkout |

## Lifecycle operations

An explicit OlogyCrew downgrade from a paid plan to free is immediate. Stripe cancellation must request proration and immediate invoice finalization so the resulting credit is recorded before a same-day re-upgrade. The local record becomes an active free entitlement while retaining the Stripe customer ID, trial history, and cancellation audit context.

An upgrade or paid-tier change on an active Stripe subscription updates the existing subscription item with Stripe proration. Re-upgrading after an immediate cancellation creates a new subscription only after Stripe has finalized the cancellation credit; the existing default payment method may be reused only when the calculated invoice balance and customer credit are visible to Stripe.

A cancellation scheduled through the Stripe customer portal does not immediately remove paid access. Stripe remains authoritative for the active period; the local record retains the paid tier, `status=active`, `cancelAtPeriodEnd=true`, and the exact period end. The cancellation webhook converts the record to the free plan only when Stripe ends the subscription.

Refunds for service bookings do not alter subscription entitlements. Subscription credits and refunds are represented by Stripe invoices/credit balance and must not be inferred from booking refund records.

## Source-of-truth rules

1. Shared plan catalogs define names, prices, features, and limits.
2. A pure shared lifecycle resolver determines effective access for both audiences.
3. Server authorization uses the resolver or capability helpers, never `subscription.tier` alone.
4. Stripe webhooks synchronize billing facts; they do not invent plan promises.
5. UI surfaces render the effective entitlement and billing-recovery state returned by the server.
6. Public pricing, authenticated subscription pages, onboarding, Help, Terms, emails, and admin analytics use the shared catalog.
7. Manual/admin grants remain supported and are never erased merely because a Stripe subscription ID is absent.

## Required invariants

At any moment, the pricing promise, effective authorization, current-plan display, onboarding state, notification copy, and admin record must agree. A free plan must never expose paid invoices or Stripe onboarding; a paid or valid-trial entitlement must never be blocked by a stale raw status; a scheduled cancellation must show the exact access end; an expired trial or completed cancellation must never retain paid access.

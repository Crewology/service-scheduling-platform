# OlogyCrew Entitlement and Billing Audit

## Audit status

This audit was completed before changing plan rules. It compares provider and customer pricing promises, backend authorization, local subscription records, Stripe synchronization, lifecycle mutations, notifications, help content, terms, and admin reporting.

## Confirmed authoritative business decisions

| Area | Authoritative decision |
|---|---|
| Provider Starter | Free; one category, three active services, one photo per service, booking management, customer messaging, standard search placement |
| Provider Pro | $12 monthly or $120.96 annually; five categories, ten active services, three photos, payments, invoicing, custom URL, priority search, and analytics |
| Provider Business | $20 monthly or $192 annually; effectively unlimited categories/services, five photos, payments, invoicing, featured placement, full analytics, branding, and priority support |
| Customer Individual | Free; five saved providers, direct bookings, quote requests, messaging, and reviews |
| Customer Coordinator | $12 monthly or $120.96 annually; fifty saved providers, priority requests, and folders |
| Customer Manager | $20 monthly or $192 annually; unlimited saves, bulk quotes, analytics/exports, and dedicated support |
| Provider payments and invoicing | Paid provider entitlement; Starter cannot connect Stripe or use provider invoicing |
| Explicit in-app downgrade to free | Immediate downgrade with an immediately generated prorated credit; data and Stripe customer identity are preserved |
| Stripe portal cancellation at period end | Paid access remains until the recorded period end while status is active; UI must show the scheduled end date |
| Paused, past-due, incomplete, or cancelled | No paid entitlement; preserve data and show a clear billing recovery path |
| Trial | One fourteen-day trial per audience/account lifetime; access ends deterministically at `trialEndsAt` |

## Confirmed contradictions

| Finding | Current behavior | Risk |
|---|---|---|
| Starter invoicing promise conflicts with authorization | `server/products.ts`, the public pricing page, and Terms advertise Starter invoicing, while `invoiceRouter.ts` correctly restricts invoicing to Pro/Business and the authenticated subscription page marks it unavailable | Customers are promised a feature the backend denies |
| Starter payment promise conflicts with authorization | Public pricing FAQ and provider onboarding say all plans include Stripe payments; `stripeConnectRouter.ts` restricts setup to paid tiers | Onboarding and pricing can cause a free provider to encounter a paywall after being promised access |
| Stripe Connect uses raw tier | Stripe onboarding checks `subscription.tier` rather than an effective entitlement resolver | Cancelled, paused, past-due, or expired-trial rows can receive incorrect access |
| Provider and customer effective-status rules differ | Provider helper denies `past_due` but grants `paused`; customer helper grants both `past_due` and `paused` and only denies cancelled/incomplete | Identical lifecycle states produce different access by audience |
| Customer downgrade state is self-contradictory | The router schedules Stripe cancellation at period end, but immediately stores `tier=free`, `status=cancelled`, while claiming paid features remain active | UI, backend access, Stripe, and notification text disagree |
| Provider and customer free-downgrade behavior differs | Provider cancels immediately; customer schedules cancellation | Duplicate lifecycle logic produces recurring regressions |
| Prorated credit is not forced to invoice | Provider immediate cancellation passes `prorate: true` without `invoice_now: true` | Credit may not be finalized before same-day re-upgrade, risking another card charge |
| Webhook period end is incorrect | Subscription updates use `ended_at` as current period end | Active subscriptions often persist without an accurate renewal/end date |
| Webhook status mapping is incomplete | All statuses except active/trialing/past_due become `incomplete`; paused and cancelled lifecycle semantics are lost | Local entitlement records can drift from Stripe |
| Upsert helpers cannot reliably clear nullable Stripe/period fields | Provider upsert writes optional fields directly; customer upsert treats `undefined` as “keep existing,” while callers also use it as “clear” | Cancelled/free records retain stale identifiers or dates inconsistently |
| Provider MRR uses obsolete prices | Admin analytics calculates Basic at $29 and Premium at $79 | Admin revenue reporting disagrees with current $12/$20 plans |
| Trial processing depends on page loads | Expiration checks mutate access only when selected pages query trial status | Access and notifications can lag until a user visits a page |
| Help and onboarding order is outdated | Help content describes a different five-step order and repeats old payment/invoice promises | Support content conflicts with the current product |

## Production data observations

The subscription tables contain valid paid, trial, free, cancelled, and manually granted records, but also reveal ambiguous legacy states: a customer `free/active` record with a Stripe subscription and `cancelAtPeriodEnd=true`, a customer `business/cancelled` record scheduled for cancellation, provider `free/cancelled` rows retaining Stripe subscription IDs, and a provider `premium/active` row without a Stripe subscription. Reconciliation must preserve legitimate manual grants rather than assuming every paid entitlement has a Stripe subscription.

## Required architecture

1. A shared provider/customer plan catalog must define prices, labels, limits, and entitlements.
2. A shared lifecycle resolver must convert persisted tier/status/dates into effective access and billing-recovery state.
3. All server authorization must use the effective resolver, not raw tier values.
4. Public pricing, authenticated plan pages, onboarding, help, terms, notifications, and admin reporting must import or derive from the same catalog.
5. Stripe webhook synchronization must preserve exact statuses, current billing period, cancellation timing, and metadata.
6. Local records must distinguish Stripe-paid, trial, free, and intentional administrative grants before enforcing Stripe-presence assumptions.
7. Lifecycle tests must cover clean accounts and Stripe-independent deterministic logic before any live-payment test.

## Change constraints

No current route or advanced feature will be removed. Existing Stripe customer IDs, subscription IDs, trials, manual grants, provider data, invoices, bookings, and saved providers must remain intact. Database cleanup will occur only after deterministic normalization rules and backups/rollback checkpoints are established.

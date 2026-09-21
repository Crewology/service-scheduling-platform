# OlogyCrew Production Test-Data Cleanup Approval

**Status:** Read-only audit and Admin reporting correction are complete. **No production record has been deleted.**

## What was found

The database currently contains **168 active users with an exact `@test.com` email domain**. Those identities own **81 inactive provider profiles**, **81 services**, **94 bookings**, **90 reviews**, **346 notifications**, **168 availability schedules**, and **6 notification-preference records**. They were created between September 6 and September 17, 2026, primarily by automated regression tests.

The exact-domain cohort has **no payment rows, invoices, Stripe payment references, provider subscriptions, customer subscriptions, quotes, or Customers/CRM contacts**. It is therefore the narrowest and lowest-risk destructive cleanup scope.

| Admin measure | Raw database count | Real activity count now shown |
|---|---:|---:|
| Users | 192 | 22 |
| Active providers | 15 | 13 |
| Bookings | 104 | 7 |
| Active services | 85 | 30 after excluding the demo and Prattis Test |

The Admin dashboard now applies a **Real activity view**. Its users, providers, bookings, reviews, subscription analytics, booking-source analytics, and KPI totals exclude the official demo, exact test domains, reserved automated identities, deleted identities where appropriate, and orphan test fixtures. This filtering is reversible and does not delete data.

## Records that will remain protected

**Demo - OlogyCrew** remains active and publicly usable. It currently includes one official provider, 54 demo services across 52 categories, and two demo bookings. Its booking flow remains available, but its activity is excluded from real Admin metrics. It has no payment records.

Gary Chisolm (`garychisolm30@gmail.com`) and Winston Williams (`wwilliams@visionkwest.com`) remain protected, along with every other unclassified account. All **11 partner-transfer rows** and all audit history remain protected. The **83 audit entries** that reference test-provider targets are retained as historical evidence; none uses a test user as the audit actor.

## Separate test candidates requiring an explicit choice

| Candidate | Current data | Financial or legal note |
|---|---|---|
| **Prattis Test** | One active provider, one active service, one provider subscription record, no bookings, quotes, payments, invoices, or Customers contacts | Uses `client.care@visionkwest.com`, not `@test.com`; requires separate approval |
| **Orphan Phase 2 CRM fixture** | One inactive provider, one service, one completed booking, two quotes, and one local payment row | The payment is marked captured but uses the unmistakably synthetic reference `pi_test_crm_phase2_...`; deleting it requires separate approval because it is a payment record |

## Proposed execution choices

**Narrow cleanup** deletes only the manifest-locked exact `@test.com` cohort: 168 users, 81 providers, 81 services, 94 bookings, and their non-financial dependencies. It preserves Prattis Test and the orphan Phase 2 fixture.

**Complete confirmed-test cleanup** performs the narrow cleanup and also removes Prattis Test plus the orphan Phase 2 CRM fixture and its synthetic local payment row. This produces the cleanest database, but it intentionally removes one record from the local payments table after verifying that its identifier is synthetic and has no real Stripe charge ID.

The deletion utility defaults to dry-run, verifies the reviewed manifest has not drifted, protects the official demo and both approved admins, aborts if any new payment, invoice, subscription, legal, or audit-actor dependency appears, and requires the exact execution token before starting a transaction.

## Validation completed

The complete OlogyCrew regression suite passed: **152 test files and 1,858 tests**. TypeScript passed with zero errors, `git diff --check` passed, and the production build completed successfully. The Admin dashboard was reviewed at desktop and mobile widths. A post-test manifest confirmed that all 168 exact-domain candidates remain untouched pending approval.

Known non-failing warnings remain unchanged: the Vitest close-timeout/open-handle warning and the existing Vite large-chunk advisory.

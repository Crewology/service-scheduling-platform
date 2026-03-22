# OlogyCrew Platform — Comprehensive Gap Analysis

**Date:** March 22, 2026
**Codebase:** 32,591 LOC across 158 files (107 client, 36 server, 15 test)
**Database:** 17 tables | **Tests:** 241 passing across 15 files | **TypeScript:** 0 errors

---

## Platform Health Summary

| Area | Status | Score |
|---|---|---|
| Core Booking Flow | Fully functional | 9/10 |
| Payment Processing (Stripe) | Functional with gaps | 7/10 |
| Provider Dashboard | Feature-rich | 8/10 |
| Customer Experience | Solid but missing polish | 7/10 |
| Admin Dashboard | Functional | 7/10 |
| Notifications (Email + SMS) | Working | 8/10 |
| Security & Hardening | Needs attention | 4/10 |
| Testing Coverage | Good for server, none for client | 6/10 |
| Mobile Responsiveness | Partially implemented | 6/10 |
| Documentation | Strong | 8/10 |

---

## CRITICAL GAPS (Revenue / Trust Blockers)

These gaps directly impact the ability to process real transactions or build user trust.

### 1. No Double-Booking Prevention (Server-Side)

The booking creation procedure (`booking.create` in `routers.ts`) does **not** check for time-slot conflicts before inserting a new booking. The frontend shows unavailable slots as disabled, but there is no server-side guard. Two simultaneous requests for the same time slot would both succeed, creating a double-booking.

**Impact:** Provider gets two bookings for the same time. One customer gets a bad experience.
**Fix effort:** Medium — add a database query in `booking.create` to check for overlapping confirmed/pending bookings before insert.

### 2. No Rate Limiting or API Abuse Protection

There is **zero** rate limiting on any endpoint — no `express-rate-limit`, no `helmet`, no CSRF protection. The tRPC endpoints, Stripe webhook, export endpoints, and calendar feeds are all unprotected.

**Impact:** Vulnerable to brute-force attacks, API abuse, and DDoS. Promo code validation could be brute-forced.
**Fix effort:** Low — add `express-rate-limit` middleware and `helmet` for security headers.

### 3. Payment Failure Notification Not Implemented

In `stripeWebhook.ts` line 162, there is a `// TODO: Notify customer of payment failure` comment. When a payment fails, the customer receives no notification.

**Impact:** Customer doesn't know their payment failed; booking sits in limbo.
**Fix effort:** Low — call `sendNotification()` with a `payment_failed` template.

### 4. No Automatic Provider Payouts

Stripe Connect is integrated for onboarding and destination charges, but there is no automatic payout scheduling or manual payout trigger. Providers depend entirely on Stripe's default payout schedule.

**Impact:** Providers have no visibility or control over when they receive funds.
**Fix effort:** Medium — this may be acceptable if Stripe's default daily/weekly payouts are sufficient, but providers should at least see payout history.

---

## HIGH-PRIORITY GAPS (User Experience / Completeness)

### 5. Verification Document Upload UI Missing

The `verification_documents` table exists in the schema and is imported in `db.ts`, but there is **no upload UI**, no server procedure to handle uploads, and no admin review workflow. Provider verification is currently done manually via the admin dashboard's approve/reject buttons with no document evidence.

**Impact:** No way for providers to submit business licenses, insurance, or ID verification.
**Fix effort:** Medium — need upload endpoint (S3), provider UI, and admin review panel.

### 6. Service Photo Gallery on Service Detail Page

Photos can be uploaded and managed by providers, but the service detail page gallery experience could be improved. There's a basic lightbox, but no carousel, no zoom, and no thumbnail navigation.

**Impact:** Services with multiple photos don't showcase well.
**Fix effort:** Low-Medium.

### 7. Booking Detail View for Providers

The todo.md notes `[ ] Add booking detail view and status management` for providers. While providers can see a booking list and change statuses, there is no dedicated detail view showing full booking information (customer contact, address, payment status, messages, timeline).

**Impact:** Providers must navigate to multiple places to get full booking context.
**Fix effort:** Medium.

### 8. Review Moderation Tools for Admin

Reviews can be submitted and responded to, but admins have **no moderation capability** — no ability to flag, hide, or remove inappropriate reviews.

**Impact:** No way to handle fake or abusive reviews.
**Fix effort:** Low-Medium — add admin procedures and UI for review management.

### 9. Location-Based Search/Filtering

The search system supports keyword, category, price range, and sort options, but there is **no location-based filtering**. The Google Maps proxy is available but not integrated into search.

**Impact:** Customers can't find providers near them — critical for mobile/in-person services.
**Fix effort:** High — requires geocoding provider addresses, storing coordinates, and distance-based queries.

### 10. "My Reviews" Page for Customers

Customers can submit reviews but have no page to see all their past reviews. The route doesn't exist.

**Impact:** Minor UX gap — customers can't track their review history.
**Fix effort:** Low.

---

## MEDIUM-PRIORITY GAPS (Polish / Enhancement)

### 11. Google Calendar Direct API Integration

The iCal feed works for subscribing, but there's no direct Google Calendar API integration for two-way sync. The iCal feed is read-only and has a refresh delay (depends on the calendar app's polling interval, typically 12-24 hours for Google Calendar).

**Impact:** Providers may not see new bookings in their calendar for hours.
**Fix effort:** High — requires Google OAuth and Calendar API integration.

### 12. Email Unsubscribe Per-Type Granularity

The unsubscribe system works at the channel level (email on/off, SMS on/off) and per notification type. However, the one-click unsubscribe link in emails disables **all** email notifications, not just the specific type.

**Impact:** Users who unsubscribe from marketing emails also lose booking confirmations.
**Fix effort:** Low — pass notification type in the unsubscribe token and only disable that type.

### 13. Service Editing Flow

Services can be created and deleted, but the **edit flow** for existing services (changing price, description, duration) uses the same CreateService form. There's no dedicated edit page or inline editing in the provider dashboard.

**Impact:** Providers must delete and recreate services to make changes (or use the basic edit dialog).
**Fix effort:** Low-Medium.

### 14. Duplicate/Stale Todo Items

The `todo.md` file has grown to 624 lines with significant duplication. Phases 5-8 at the top list items as unchecked (`[ ]`) that were actually completed in later phases. This creates confusion about what's actually done vs. pending.

**Impact:** Development confusion; hard to assess true project status.
**Fix effort:** Low — consolidate and clean up todo.md.

### 15. ComponentShowcase Page Still in Production

The `/component-showcase` route doesn't exist in `App.tsx`, but the `ComponentShowcase.tsx` file (1400+ lines) is still in the codebase, adding to bundle size.

**Impact:** Dead code in production bundle.
**Fix effort:** Trivial — delete the file.

---

## LOW-PRIORITY GAPS (Nice-to-Have / Future)

### 16. Additional OAuth Providers (Google, Apple)

Only Manus OAuth is supported. Google and Apple sign-in would broaden the user base.

### 17. User Profile Management Completeness

The UserProfile page exists with basic fields (name, email, phone), but there's no profile photo upload, no address management, and no account deletion option.

### 18. System Health Monitoring for Admin

The admin dashboard shows platform analytics but has no system health panel (server uptime, database status, error rates, queue depth).

### 19. Seed Data Script Maintenance

The seed data script (`seed-data.mjs`) was created in Phase 7 but may be out of date with schema changes from Phases 10-15 (new tables: promo_codes, promo_redemptions, notification_preferences, provider_subscriptions).

### 20. Frontend Test Coverage

There are **zero client-side tests**. All 241 tests are server-side (tRPC procedures, database helpers, business logic). No React component tests, no integration tests for the booking flow UI.

### 21. Upgrade Prompts When Limits Are Reached

The todo notes this as incomplete: `[ ] Add upgrade prompts when limits are reached (toast notification added, could enhance)`. Currently a basic toast appears, but there's no modal or guided upgrade flow.

### 22. Referral Program (Customer-to-Customer)

The promo code system supports provider-created codes, but there's no customer referral program where existing customers get a unique code to share with friends for mutual discounts.

### 23. Payment Receipt Generation

No formal receipt/invoice PDF is generated after payment. Customers rely on Stripe's email receipts.

### 24. Real-Time Messaging (WebSocket)

Messages use 5-second polling instead of WebSocket/SSE for real-time delivery. This works but is inefficient and has noticeable latency.

---

## Architecture & Code Quality Notes

| Observation | Severity | Detail |
|---|---|---|
| `routers.ts` is 950+ lines | Medium | Should be split into feature-specific router files (booking, review, provider, etc.) |
| `db.ts` is 1850+ lines | Medium | Single file with all database helpers; should be split by domain |
| Empty catch blocks | Low | `db.ts:1847` silently swallows JSON parse errors in promo code validation |
| No input sanitization | Medium | User-provided strings (names, descriptions, notes) are stored as-is with no XSS sanitization |
| No pagination on some list endpoints | Low | Some list queries return all results without limit/offset |
| DevToolsPanel in production | Low | The floating dev tools panel is included in production builds |

---

## Recommended Priority Order

If I were to address these gaps, here's the order I'd recommend:

| Priority | Gap | Why |
|---|---|---|
| 1 | Double-booking prevention | Data integrity — can cause real customer harm |
| 2 | Rate limiting + security headers | Security baseline for any production app |
| 3 | Payment failure notifications | Customer trust — they need to know when payments fail |
| 4 | Todo.md cleanup | Development clarity — know what's truly done |
| 5 | Verification document upload | Provider trust — needed for marketplace credibility |
| 6 | Booking detail view for providers | Provider workflow completeness |
| 7 | Review moderation for admin | Content safety |
| 8 | Location-based search | Core marketplace feature for service discovery |
| 9 | Router/db.ts file splitting | Code maintainability |
| 10 | Remove dead code (ComponentShowcase, DevToolsPanel) | Clean production bundle |

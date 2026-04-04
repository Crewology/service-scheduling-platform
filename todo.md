# OlogyCrew Service Scheduling Platform — TODO

## Completed Features (Phases 1–17)

### Foundation & Core
- [x] Database schema (19 tables), seed data, query helpers
- [x] Manus OAuth authentication with role-based access (customer/provider/admin)
- [x] Provider registration, onboarding wizard, profile management
- [x] Service catalog with categories, search, filtering, pagination
- [x] Flexible pricing models (fixed, hourly, package, custom)
- [x] Service photo uploads (S3) with tier-gated limits

### Booking & Scheduling
- [x] Real-time availability system (weekly schedules + date overrides)
- [x] Interactive booking calendar with time slot selection
- [x] Step-by-step booking flow (date → time → details → confirm → pay)
- [x] Booking status management (pending, confirmed, in_progress, completed, cancelled, no_show, refunded)
- [x] Double-booking prevention (server-side time-slot conflict check)
- [x] Customer bookings dashboard with export (CSV/PDF)

### Payments
- [x] Stripe Checkout integration (deposit + full payment)
- [x] Stripe Connect for provider payouts (destination charges, 1% platform fee)
- [x] Cancellation refund automation (time-based: 48h=100%, 24h=75%, 4h=50%, <4h=0%)
- [x] Stripe webhook handler (checkout, payment success/failure, refunds, subscriptions)
- [x] Payment failure notifications (email + in-app)
- [x] Provider subscription tiers (Free/Basic/Premium) with feature gating

### Promo Code System
- [x] Promo code CRUD for providers (percentage + fixed discounts)
- [x] Usage limits, expiration dates, service-specific codes, min order / max discount caps
- [x] Promo code input in booking flow with real-time validation and discount preview
- [x] Promo redemption tracking and analytics

### Customer Referral Program
- [x] referral_codes and referrals tables in schema
- [x] Auto-generated unique referral codes (REF-XXXXXX) per customer
- [x] Referral tRPC router (getMyCode, validate, applyCode, getStats, getHistory, updateSettings, lookup)
- [x] Referrals page with code sharing, stats dashboard, and referral history
- [x] Referral code input in ServiceDetail booking flow (confirm step)
- [x] Referee discount applied to booking total via bookingRouter
- [x] Referral recorded on successful booking
- [x] Configurable referrer/referee discount percentages (default 10%/10%)
- [x] Max referrals limit per code

### Communication
- [x] Messaging system with conversation threading by booking
- [x] Unified notification service (email via Forge API, SMS via Twilio)
- [x] Notification center UI (bell icon, dropdown, full page)
- [x] Email unsubscribe + notification preferences per channel/type
- [x] 24-hour booking reminder service
- [x] Booking confirmation, status change, and cancellation emails

### Provider Tools
- [x] Provider dashboard (services, bookings, availability, analytics, payments, widgets, promo codes)
- [x] Provider analytics (booking trends, revenue, retention, top services, booking sources)
- [x] Public provider profiles (/p/:slug) with custom slugs
- [x] Embeddable booking widgets (iframe, popup, direct link) with code generator
- [x] iCal calendar feed with REFRESH-INTERVAL for faster sync (PT15M)
- [x] Individual booking .ics download endpoint (/api/calendar/booking/:id.ics)
- [x] webcal:// one-click subscription button for instant calendar sync
- [x] "Add to Calendar" button on BookingDetail page
- [x] Google Calendar, Apple Calendar, Outlook support via iCal/webcal
- [x] Stripe Connect onboarding + balance display + dashboard link
- [x] Verification document upload (identity, business_license, insurance, background_check)

### Admin
- [x] Admin dashboard (user management, provider verification, transaction monitoring)
- [x] Platform analytics (bookings, revenue, user growth, subscription MRR)
- [x] Provider approval/rejection workflow
- [x] Subscription analytics (MRR, tier distribution, churn, conversion rates)
- [x] Review moderation panel (flag/hide/delete reviews)
- [x] Verification document review panel (approve/reject)

### Security & Infrastructure
- [x] Helmet security headers
- [x] Express rate limiting (general + sensitive endpoints)
- [x] Trust proxy for reverse proxy environments

### Code Architecture (Phase 17)
- [x] Split db.ts (2039 lines) into 12 domain-specific files under server/db/
- [x] Split routers.ts (1255 lines) into 9 feature-specific files under server/routers/
- [x] Barrel index.ts re-exports for backward compatibility (db.ts → db-legacy.ts shim)
- [x] All existing imports continue to work with 0 regressions

### Documentation & Testing
- [x] BUILD_LOG.md, ARCHITECTURE.md, ROADMAP.md
- [x] 304 tests passing across 18 test files (0 failures)

---

## Known Future Enhancements (Not Blocking)
- [ ] Additional OAuth providers (Google, Apple)
- [ ] Profile photo upload for customers
- [ ] System health monitoring in admin dashboard
- [ ] Frontend component tests (currently server-only)
- [ ] Payment receipt PDF generation
- [ ] Real-time WebSocket messaging (currently 5s polling)
- [ ] Upgrade prompts when subscription limits are reached
- [ ] Service editing flow improvements
- [ ] Email unsubscribe granularity per notification type

## Hotfix: Provider Role & Onboarding Testing
- [x] Fix owner account role to provider so provider dashboard is accessible
- [x] Verify provider onboarding/profile building flow works end-to-end on dev preview

## Phase 18: Multi-Category Provider Redesign

- [x] Provider profile photo upload (during onboarding and in dashboard)
- [x] Multi-category selection system (providers choose from 42 categories)
- [x] Per-category service creation with individual pricing
- [x] Provider Stripe Connect payment setup integrated into onboarding
- [x] Redesigned provider onboarding wizard (photo → categories → services → pricing → Stripe)
- [x] Provider dashboard: manage multiple categories and their services
- [x] Provider mini-website public profile (showcases all categories & services)
- [x] Customer search/browse works with multi-category providers
- [x] Database schema updates for provider-category relationships
- [x] Tests for multi-category provider flow (304 tests passing)

## Bug Fix: Mobile Dashboard Tab Overflow
- [x] Fix provider dashboard tab buttons running off the page on mobile

## Follow-up: Dashboard UX Improvements
- [x] Consolidate 12 dashboard tabs into 6 logical groups (Bookings, Services, Schedule, Finances, My Page, More)
- [x] Add mobile bottom navigation bar for dashboard (6 icons fixed to bottom on mobile)
- [x] Test provider onboarding flow end-to-end — all 4 steps verified working

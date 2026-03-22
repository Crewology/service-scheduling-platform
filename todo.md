# OlogyCrew Service Scheduling Platform — TODO

## Completed Features (Phases 1–16)

### Foundation & Core
- [x] Database schema (17 tables), seed data, query helpers
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
- [x] iCal calendar feed for Google Calendar / Apple Calendar / Outlook sync
- [x] Stripe Connect onboarding + balance display + dashboard link

### Admin
- [x] Admin dashboard (user management, provider verification, transaction monitoring)
- [x] Platform analytics (bookings, revenue, user growth, subscription MRR)
- [x] Provider approval/rejection workflow
- [x] Subscription analytics (MRR, tier distribution, churn, conversion rates)

### Security & Infrastructure
- [x] Helmet security headers
- [x] Express rate limiting (general + sensitive endpoints)
- [x] Trust proxy for reverse proxy environments

### Documentation & Testing
- [x] BUILD_LOG.md, ARCHITECTURE.md, ROADMAP.md
- [x] 241 tests passing across 15 test files
- [x] DevToolsPanel for development testing

---

## Phase 16: Gap Analysis Fixes (In Progress)

### Priority 1: Double-Booking Prevention — DONE
- [x] Server-side time-slot conflict check in booking.create

### Priority 2: Rate Limiting & Security — DONE
- [x] Helmet + express-rate-limit installed and configured

### Priority 3: Payment Failure Notifications — DONE
- [x] Email + in-app notification on payment_intent.payment_failed

### Priority 4: Todo.md Cleanup — DONE
- [x] Consolidated 690-line todo into clean single-source-of-truth (690 → 120 lines)

### Priority 5: Verification Document Upload — DONE
- [x] Create document upload tRPC endpoint (S3 storage)
- [x] Build verification document upload UI for providers
- [x] Add document review panel in admin dashboard
- [x] Track document status (pending, approved, rejected)

### Priority 6: Provider Booking Detail View — DONE
- [x] Create dedicated booking detail page (/booking/:id)
- [x] Show full booking info (customer, address, payment, messages, timeline)
- [x] Link View Details from ProviderDashboard and MyBookings

### Priority 7: Admin Review Moderation — DONE
- [x] Add admin procedures to flag/hide/remove reviews
- [x] Build review moderation panel in admin dashboard (Reviews tab)
- [x] Show reviewer, provider, rating, text, flagged status

### Priority 8: Location-Based Search — DONE
- [x] Add location filter to service.search procedure (city/state/zip text match)
- [x] Add location input field to Search page UI
- [x] Support price sorting in search results

### Priority 9: Router/DB File Splitting
- [ ] Split routers.ts (~950 lines) into feature-specific router files (deferred — low risk)
- [ ] Split db.ts (~1850 lines) into domain-specific helper files (deferred — low risk)

### Priority 10: Dead Code Removal — DONE
- [x] Remove DevToolsPanel from production App.tsx
- [x] Fix promo code validFrom clock skew issue (60s grace period)

### Phase 16 Testing — DONE
- [x] Write tests for double-booking prevention (3 tests)
- [x] Write tests for verification document upload (5 tests)
- [x] Write tests for review moderation (5 tests)
- [x] Write tests for location-based search (3 tests)
- [x] Write tests for promo code clock skew fix
- [x] All 270 tests pass across 16 test files (0 failures)

---

## Known Future Enhancements (Not Blocking)
- [ ] Google Calendar direct API integration (currently iCal feed only)
- [ ] Additional OAuth providers (Google, Apple)
- [ ] Profile photo upload for customers
- [ ] System health monitoring in admin dashboard
- [ ] Frontend component tests (currently server-only)
- [ ] Customer referral program (referrer + referee rewards)
- [ ] Payment receipt PDF generation
- [ ] Real-time WebSocket messaging (currently 5s polling)
- [ ] Upgrade prompts when subscription limits are reached

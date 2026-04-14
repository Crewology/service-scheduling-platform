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

## Feature: Provider Portfolio/Gallery
- [x] Database schema for portfolio items (photos/work samples per category)
- [x] Server endpoints for CRUD portfolio items with S3 upload
- [x] Portfolio upload UI in provider dashboard (Services tab)
- [x] Portfolio gallery display on public provider profile mini-website

## Feature: Location-Based Search Filters
- [x] Add price range, rating, and location filters to category browse page
- [x] Service type filter (in-person, mobile, virtual, hybrid)
- [x] Filter UI with sticky filter bar + expandable panel on mobile

## Feature: Provider Onboarding Checklist Widget
- [x] Dashboard checklist card showing incomplete setup steps (6 steps)
- [x] Progress bar showing completion percentage
- [x] Clickable steps linking to relevant setup pages
- [x] Auto-hides when all steps complete, dismissible by provider

## Testing (previous)
- [x] 319 tests passing across 19 test files (0 failures)

## Feature: Featured Providers on Homepage
- [x] Enhanced listFeatured endpoint with categories, profile photos, and ratings
- [x] Featured Providers section on homepage with provider cards
- [x] Provider cards with photo, name, categories, rating, and "View Profile" CTA

## Feature: Availability Quick-View on Category Browse
- [x] getNextAvailable endpoint returning next available slots (7-day window)
- [x] AvailabilityQuickView component on category browse provider cards
- [x] Green badges showing next available day/time per provider

## Feature: Before/After Photo Pairs in Portfolio
- [x] Portfolio schema already supports before/after (mediaType + beforeImageUrl fields)
- [x] Before/after upload UI with dual photo pickers in portfolio dialog
- [x] Interactive comparison slider (BeforeAfterCard) on dashboard and public profile
- [x] "Before & After" badge on portfolio items

## Testing
- [x] 328 tests passing across 20 test files (0 failures)

## Feature: Customer Favorites/Saved Providers
- [x] Database schema for customer_favorites table
- [x] Server endpoints for add/remove/list/check favorites
- [x] Heart icon on public provider profile to toggle favorite
- [x] Saved Providers page accessible from customer navigation
- [x] "Saved" link added to desktop and mobile nav

## Feature: Provider Service Package Builder
- [x] Database schema for service_packages and package_items tables
- [x] Server endpoints for CRUD packages with bundled pricing
- [x] Package builder UI in provider dashboard (Services tab)
- [x] Package display on public provider profile with savings badge

## Feature: Provider Response Time Tracking
- [x] Track message response times from conversation history
- [x] Compute average response time per provider via API endpoint
- [x] Display response time badge on public provider profile
- [x] Display response time badge on category browse provider cards

## Testing
- [x] 341 tests passing across 21 test files (0 failures)

## Feature: Provider Schedule Conflict Detector
- [x] Server-side conflict detection when accepting/confirming bookings
- [x] Check for overlapping time slots across all provider bookings (all categories)
- [x] Warning UI in provider dashboard when confirming a booking that conflicts
- [x] Conflict indicator on booking cards showing overlapping bookings
- [x] Allow provider to override and accept anyway with acknowledgment

## Feature: Request a Quote Flow
- [x] Database schema for quote_requests table
- [x] Server endpoints for creating, listing, responding to quote requests
- [x] Customer UI: "Request a Quote" button on provider profile page
- [x] Customer quote request form (title, description, preferred date/time, location type, address)
- [x] Provider UI: Quote requests section in Bookings tab of dashboard
- [x] Provider quote response dialog (price, duration, notes, validity period)
- [x] Customer "My Quotes" page with accept/decline actions
- [x] "Quotes" link added to NavHeader (desktop + mobile)
- [x] Provider can decline quote requests
- [x] Customer can decline quoted prices with optional reason
- [x] Quote count badge on provider dashboard

## Testing
- [x] 356 tests passing across 22 test files (0 failures)
- [x] 15 new quote flow tests (request, respond, accept, decline, authorization)

## Bug Fix: PublicProviderProfile Hooks Error
- [x] Fix "Rendered more hooks than during the previous render" error on /p/:slug page
- [x] Ensure all hooks are called unconditionally (no hooks after early returns)

## UX Fix: Profile Photo & Verification Documents
- [x] Add profile photo upload to the "My Profile" page (hover-to-upload with camera icon)
- [x] Add delete button for uploaded verification documents (with confirm/cancel)

## Bug Fix: Complete Your Profile Checklist
- [x] Profile photo check not reflecting uploaded photo — getMyProfile now enriches with user's profilePhotoUrl
- [x] "Write Bio" step now opens the Edit Business Profile dialog directly with Bio/Description field
- [x] "Add Photo" step now opens a file picker directly from the checklist
- [x] Bio check fixed to use `description` field (provider table has no `bio` column)

## Bug Fix: Checklist Action Navigation
- [x] "Upload work samples" now switches to Portfolio tab and opens the upload dialog
- [x] "Connect payment account" now navigates to /provider/onboarding?step=4 (directly to Get Paid step)
- [x] Added query param support to ProviderOnboarding for deep-linking to specific steps

## Feature: Privacy Policy & Terms of Service Pages
- [x] Create Privacy Policy page at /privacy (with SMS section, data practices, user rights)
- [x] Create Terms of Service page at /terms (with SMS program details, STOP/START/HELP info)
- [x] Add routes in App.tsx
- [x] Update footer links to point to /terms and /privacy (were pointing to /browse)

## Feature: SMS Opt-Out/Opt-In Webhook
- [x] Create Twilio incoming SMS webhook endpoint at /api/twilio/sms
- [x] Handle STOP/UNSUBSCRIBE/CANCEL/END/QUIT keywords to opt user out
- [x] Handle START/SUBSCRIBE/YES/UNSTOP keywords to opt user back in
- [x] Handle HELP/INFO keywords with program info reply
- [x] Send confirmation TwiML reply messages
- [x] Update user notification preferences in database (all SMS toggles)
- [x] Phone number normalization to match various DB formats
- [x] 10 tests for webhook handling (all passing, 367 total)

## Feature: Multi-Day Range Booking
- [x] Extend bookings schema with bookingType (single/multi_day/recurring), endDate, totalDays fields
- [x] Add booking_sessions table for individual day entries within multi-day/recurring bookings
- [x] Backend: createMultiDay procedure with availability check across all days
- [x] Backend: conflict detection for multi-day bookings (checks each day)
- [x] Frontend: end date picker on service detail page for multi-day eligible categories
- [x] Frontend: multi-day price calculation display (per-day rate × number of days)
- [x] Provider dashboard: display multi-day bookings with date range and day count badge
- [x] Customer My Bookings: show multi-day bookings with date range
- [x] Category-based auto-detection: AV Crew, TV/Film, Event Planning, Day Labor, Home Renovation

## Feature: Recurring Booking
- [x] Extend schema with recurrence fields (frequency, daysOfWeek, totalSessions)
- [x] Backend: createRecurring procedure that generates individual sessions
- [x] Backend: availability check for all recurring session dates
- [x] Frontend: day-of-week toggle buttons, weekly/biweekly frequency selector, weeks stepper (1-52)
- [x] Frontend: recurring price calculation display (per-session rate × total sessions)
- [x] Provider dashboard: display recurring bookings with session count and frequency badge
- [x] Customer My Bookings: show recurring bookings with session count
- [x] Category-based auto-detection: Fitness, Personal Trainer, Dance, Cleaning, Massage, Pet Care

## Testing
- [x] 22 new multi-day/recurring tests (date range, session generation, pricing, validation, categories)
- [x] All 389 tests passing across 24 test files

## Feature: OlogyCrew Official Provider (Hybrid "Tom" Approach)
- [x] Add isOfficial flag to serviceProviders schema
- [x] Create seed script for OlogyCrew Official account with 69 services across 41 categories
- [x] Add official/verified badge (OfficialBadge component) to provider cards in browse and search results
- [x] Add official badge to public provider profile page
- [x] Ensure official provider appears first in every category browse (listByCategory + listFeatured)
- [x] Official provider profile showcases best practices (complete profile, availability, services)
- [x] Write tests for official provider functionality (9 tests: schema, data, sorting)
- [x] Fix price sort regression (official-first grouping now skipped when sortBy=price)

## Testing
- [x] 398 tests passing across 25 test files (0 failures, 0 TypeScript errors)

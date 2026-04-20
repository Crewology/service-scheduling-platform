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

## Feature: Convert Accepted Quotes to Bookings
- [x] Auto-create booking when customer accepts a quoted price (in updateQuoteStatus)
- [x] Auto-populate booking with quote details (service, price, duration, date/time, provider, customer)
- [x] Update quote status to 'booked' and link via bookingId after successful booking creation
- [x] Show "View Booking" button on accepted/booked quotes in My Quotes page
- [x] Link quote_request to booking via quoteRequestId field on bookings table
- [x] Add bookingSource='quote' enum value to bookings schema
- [x] Toast with "View Booking" action on successful quote acceptance
- [x] Write 5 tests for quote-to-booking conversion (auto-create, link, source, decline, fee calc)

## Feature: Recurring Booking Session Management
- [x] Add rescheduled status to booking_sessions + rescheduledToSessionId, rescheduledFromDate, rescheduledAt columns
- [x] Provider: mark individual sessions as completed or cancelled with notification
- [x] Customer + Provider: reschedule individual sessions with conflict detection
- [x] Show session list with status badges, stats summary on BookingDetail page
- [x] Inline reschedule form with date/time pickers and conflict checking
- [x] Add getSessionById, rescheduleSession, createSingleSession DB helpers
- [x] Write 10 tests for session management (complete, cancel, reschedule, auth, conflicts)

## Feature: SMS/Email Notifications for Quotes
- [x] Send SMS + email to provider when customer submits a new quote request (quote_request_new)
- [x] Send SMS + email to customer when provider responds with pricing (quote_response_received)
- [x] Send SMS + email to provider when customer accepts (quote_accepted) or declines (quote_declined)
- [x] Send email notifications for session status changes (session_completed, session_cancelled, session_rescheduled)
- [x] All notification templates created with proper formatting
- [x] Write 4 tests for quote notification triggers

## Testing
- [x] 420 tests passing across 26 test files (0 failures, 0 TypeScript errors)

## Feature: Customer Review Reminders
- [x] Add reviewReminderSent flag to bookings schema to prevent duplicate reminders
- [x] Create review_reminder notification type and email/SMS templates
- [x] Build reviewReminderService with 30-min interval checking completed bookings 24h+ ago
- [x] Send personalized email/SMS with direct link to leave a review (/booking/:id/review)
- [x] Add triggerReviewReminders admin endpoint for manual triggering
- [x] Include unsubscribe link in reminder emails
- [x] Write 12 tests for review reminder logic (service, templates, schema, admin trigger)

## Feature: Provider Calendar View
- [x] Create calendarEvents tRPC endpoint fetching provider bookings + sessions
- [x] Build ProviderCalendar page with month and week views
- [x] Show booking details (service, customer, time, status) on calendar events
- [x] Color-code events by status (7 statuses: pending, confirmed, in_progress, completed, cancelled, scheduled, rescheduled)
- [x] Add Calendar View button to provider dashboard bookings tab + /provider/calendar route
- [x] Click-through from calendar event to booking detail via modal + "View Booking Details" link
- [x] Breadcrumb navigation back to dashboard
- [x] Stats summary cards (total, pending, confirmed, completed)
- [x] Today highlight, status legend, responsive design

## Testing
- [x] 432 tests passing across 27 test files (0 failures, 0 TypeScript errors)

## Bug Fix: Logout Not Visible
- [x] Add visible logout option to user navigation (UserMenuDropdown with Profile, Settings, Log Out)
- [x] Add logout to mobile menu (MobileLogoutButton with red styling)

## Feature: Tiered Subscription System (Saved Provider Limits)
- [x] Add customer_subscriptions schema (tier, status, stripeSubscriptionId, stripeCustomerId, periods)
- [x] Define Stripe products/prices for Pro ($9.99/mo, $7.99/mo yearly) and Business ($24.99/mo, $19.99/mo yearly)
- [x] Create customerSubscriptionRouter with getSubscription, getTiers, createCheckout, createPortalSession, canSaveMore
- [x] Enforce saved provider limits in toggleFavorite: Free=10, Pro=50, Business=unlimited
- [x] Build UpgradeModal component with tier comparison, shown when limit reached
- [x] Build /pricing page with plan cards, feature comparison table, billing toggle, FAQ
- [x] Updated SavedProviders page with usage bar, tier badge, upgrade prompt, near-limit warnings
- [x] Handle Stripe webhooks for customer subscriptions (created, updated, cancelled) via metadata.type
- [x] Subscription badge on SavedProviders page (Free/Pro/Business with icons)
- [x] Write 25 tests for subscription tiers, limits, DB helpers, router, webhooks, schema

## Testing
- [x] 452 tests passing across 28 test files (0 TypeScript errors)

## Feature: Provider Availability Exceptions (Block Dates)
- [x] Leveraged existing availability_overrides schema (overrideDate, isAvailable, reason, startTime, endTime)
- [x] Override checking integrated into single, multi-day, and recurring booking creation flows
- [x] Blocked dates shown on provider calendar view via calendarEvents endpoint
- [x] Enhanced ManageAvailability UI with quick-block presets (Next Week, Next 2 Weeks, Custom Range)
- [x] Delete buttons on each override with confirmation
- [x] Write 8 tests for override checking, multi-day, recurring, and calendar integration

## Feature: Saved Provider Folders (Pro/Business Perk)
- [x] Add saved_provider_folders schema (userId, name, color, icon, sortOrder)
- [x] Add folderId to customer_favorites table to assign providers to folders
- [x] Create foldersRouter with create, update, delete, list, moveToFolder, removeFromFolder
- [x] Build folder sidebar UI on SavedProviders with color picker, create/edit/delete modals
- [x] Move-to-folder dropdown on each provider card
- [x] Filter by folder with count badges
- [x] Folder deletion moves providers to uncategorized
- [x] Write 10 tests for folder CRUD, assignment, deletion, and tier gating

## Feature: Booking Analytics Dashboard (Business Perk)
- [x] Create customerAnalytics DB helpers: getCustomerSpendingSummary, getMonthlySpending, getTopProviders, getCategoryBreakdown, getRecentBookings
- [x] Build /analytics page with summary cards, monthly bar chart, top providers, category breakdown, recent bookings table
- [x] Date range: last 12 months of data
- [x] Gate analytics page behind Business subscription tier with upgrade prompt
- [x] Add analytics button to SavedProviders page for Business subscribers
- [x] Write 15 tests for analytics calculations, tier gating, and data formatting

## Testing
- [x] 485 tests passing across 29 test files (0 TypeScript errors, 5 pre-existing timeouts)

## Feature: Bulk Quote Requests (Business Perk)
- [x] Create bulkRequestQuote backend procedure (send quote to multiple providers at once with batchId)
- [x] Gate behind Business subscription tier (bulkQuoteRequests perk)
- [x] Build BulkQuoteModal UI: select saved providers, compose single quote, send to all
- [x] Integrated into SavedProviders page with "Bulk Quote" button
- [x] Send notifications to each provider individually via existing notification system
- [x] Write 25 tests for bulk quote requests, tier gating, validation, batch ID generation

## Feature: Provider Onboarding Wizard Improvements
- [x] Add overall progress percentage bar to onboarding wizard header
- [x] Add step descriptions visible on desktop below each step circle
- [x] Enhanced dashboard OnboardingChecklist with 7 items (added availability check)
- [x] "What's Next" nudge section showing next incomplete step with action button
- [x] Celebration state with confetti icon when all 7 steps complete
- [x] Progress percentage displayed in checklist header
- [x] Write tests for onboarding progress tracking (step completion, percentage calculation)

## Feature: Booking History Export (Business Perk)
- [x] Create getCustomerBookingsForExport DB helper with date range filtering
- [x] Create exportBookings tRPC endpoint (CSV and JSON formats)
- [x] Add ExportControls component to BookingAnalytics page with date pickers
- [x] Quick date range buttons (3M, 6M, 1Y, All)
- [x] Gate behind Business subscription tier (bookingAnalytics perk)
- [x] Client-side file download with dynamic filenames
- [x] Write tests for CSV generation, date filtering, tier gating, filename generation

## Testing
- [x] 510 tests passing across 30 test files (0 TypeScript errors, 5 pre-existing timeouts)

## Feature: PDF Export for Booking History (Business Perk)
- [x] pdfkit already installed — used for comprehensive analytics report
- [x] Create server-side PDF generation endpoint (/api/export/analytics/pdf) with OlogyCrew branding
- [x] Include summary section (total bookings, completed, cancelled, total spent, avg booking, platform fees)
- [x] Include visual spending chart (bar chart of monthly spending with Y-axis gridlines)
- [x] Include category breakdown chart (stacked horizontal bar with legend)
- [x] Include top providers section (ranked list with horizontal bar chart)
- [x] Include detailed booking history table (50-row limit with status color coding)
- [x] Add "PDF Report" button to BookingAnalytics ExportControls (blue accent, BarChart3 icon)
- [x] Gate behind Business subscription tier (403 for non-Business)
- [x] Write 23 tests for PDF export (module, tier gating, date handling, content, colors, filenames)
- [x] Page numbers, branded header bar, footer, PDF metadata (title, author, creator)
- [x] Date range filtering via query params (?startDate=&endDate=)

## Feature: Mobile Responsiveness Audit & Fix
- [x] Audit all key pages on mobile viewport (375px) and document issues
- [x] Fix navigation/header overlapping on mobile (notification dropdown max-width)
- [x] Fix homepage layout and text sizing on mobile (hero, sections, CTA, footer grid)
- [x] Fix browse/search pages for mobile (heading text sizing)
- [x] Fix booking detail/flow pages for mobile (action buttons wrap, time slot grids)
- [x] Fix customer dashboard for mobile (BookingAnalytics stat cards, header)
- [x] Fix provider dashboard for mobile (stat cards, header, form grids, tab bar)
- [x] Fix analytics/export page for mobile (header text sizing)
- [x] Fix quotes/messages pages for mobile (MyQuotes header, Messages chat height)
- [x] Fix profile and settings pages for mobile (PublicProviderProfile, SubscriptionManagement, CustomerPricing, Referrals)
- [x] Fix onboarding wizard for mobile (step tracker, form grids, heading)
- [x] Fix saved providers page for mobile (header button wrapping)
- [x] Fix AdminDashboard tables with overflow-x-auto wrappers (4 tables)
- [x] Fix ProviderCalendar cells min-height for mobile
- [x] Fix EmbedBooking time slots grid for mobile
- [x] Fix PromoCodes form grid for mobile
- [x] Fix BulkQuoteModal date/time grid for mobile
- [x] Fix CategoryDetail heading and icon sizing for mobile
- [x] Verify all fixes — 0 TypeScript errors, 533 tests passing (5 pre-existing timeouts)

## Feature: Real-Time Notification System (SSE)
- [x] Review current notification schema, endpoints, and dropdown UI
- [x] Build server-side SSE endpoint (/api/sse/notifications) with JWT cookie auth
- [x] Create SSEManager singleton (server/sseManager.ts) with heartbeat, multi-tab support
- [x] Integrate SSE triggers into booking creation (provider + customer notifications)
- [x] Integrate SSE triggers into booking status changes (confirmed, completed, cancelled, in-progress)
- [x] Integrate SSE triggers into messaging flow (new message notifications + pushMessageNotification)
- [x] Hook createNotification (both db-legacy and db/notifications) to auto-push SSE events
- [x] Update NotificationDropdown to use SSE via useSSE hook (slower polling fallback when connected)
- [x] Add toast notifications for real-time events (booking + message toasts via sonner)
- [x] Handle SSE reconnection with exponential backoff (1s to 30s max)
- [x] Write 34 tests for SSE manager, event format, notification types, auth, integration
- [x] Verified: 0 TypeScript errors, SSE endpoint returns 401 for unauthenticated requests

## Bug Fix: Provider Dashboard Booking Cards Mobile Overflow
- [x] Fix "Message Customer" button and booking card content running off screen on mobile
- [x] Added flex-wrap to all button containers in booking cards, quote cards, and services section
- [x] Added min-w-0 and truncate to booking number in card header
- [x] Added overflow-hidden to base Card component to prevent all card content spillover

## Feature: Comprehensive Help Center
- [x] Build Help Center page (/help) with searchable content
- [x] Getting Started section (4 articles: account, browsing, first booking, platform overview)
- [x] For Customers section (7 articles: bookings, messaging, quotes, saved providers, reviews, cancellations, analytics)
- [x] For Providers section (8 articles: onboarding, services, availability, bookings, quotes, portfolio, profile, promos/widgets)
- [x] Payments & Billing section (6 articles: how payments work, fees, provider tiers, customer tiers, refunds, promo codes)
- [x] Account & Settings section (4 articles: profile, notifications, referrals, privacy)
- [x] FAQ section with 15 searchable items, accordion UI, and 4 category filters
- [x] Contact/Support section with email (garychisolm30@gmail.com) and phone ((678) 525-0891)
- [x] Add Help link to navigation header (desktop + mobile)
- [x] Add Help Center and Contact Support links to footer
- [x] Quick Links grid (6 links to key pages)
- [x] Browse by Topic navigation cards
- [x] Search bar filtering across all articles and FAQ
- [x] Write 21 tests for help content structure, FAQ filtering, contact info, tier accuracy
## Feature: Help Center Contact Form
- [x] Build tRPC endpoint for contact form submissions (public procedure — no login required)
- [x] Send owner notification via notifyOwner() on every submission
- [x] Send confirmation email to submitter with reference number
- [x] Store contact submissions in database (contactSubmissions table with status tracking)
- [x] Replace static contact info with interactive ContactForm component in Help Center
- [x] Include name, email, subject, category (6 options), and message fields
- [x] Add form validation (required fields, email format, 10-5000 char message), success/error states
- [x] Success state with reference number, "Send Another Message" button
- [x] Admin endpoints: list submissions, update status (new/in_progress/resolved/closed)
- [x] Character counter on message field (X/5000)
- [x] Direct contact info (email + phone) preserved below form
- [x] Write 23 tests for contact form (validation, categories, notification content, form behavior)

## Feature: Admin Contact Submissions Panel
- [x] Admin Contact Submissions Panel - view, filter, and manage contact form submissions
- [x] Contact submission status tracking (new/in-progress/resolved/closed) with admin updates
- [x] Admin reply to contact submissions with email delivery to submitter
- [x] Reply history stored in database (contact_replies table)
- [x] Canned auto-reply templates - CRUD management for common inquiry categories
- [x] Template quick-select in reply UI for fast responses
- [x] Tests for admin contact management and auto-reply template endpoints

## Feature: Seed Starter Reply Templates
- [x] Pre-populate 6 canned reply templates for common support categories (general, booking, payment, provider, technical, other)

## Feature: Favicon & Logo Setup
- [x] Process OlogyCrew clock icon into favicon (ICO + PNG sizes)
- [x] Upload logo to CDN and set as VITE_APP_LOGO
- [x] Set favicon in client/index.html

## Bug: Navbar Logo Overlapping
- [x] Fix logo + "OlogyCrew" text overlapping with "Browse Services" nav link on desktop

## Feature: Progressive Web App (PWA)
- [x] Create web app manifest (manifest.json) with app name, icons, theme colors
- [x] Create service worker for offline caching
- [x] Register service worker in the app
- [x] Add install prompt UI for users to install the app
- [x] Link manifest in index.html with proper meta tags

## Feature: PWA Splash Screen
- [x] Generate splash screen images for various device sizes
- [x] Update manifest with splash screen configuration
- [x] Add apple-touch-startup-image meta tags for iOS

## Feature: Offline Booking Page
- [x] Cache user's upcoming bookings data in IndexedDB/localStorage
- [x] Update service worker to serve offline booking page
- [x] Create offline-aware booking list UI with sync indicator

## Feature: Web Push Notifications
- [x] Generate VAPID keys for push notification server
- [x] Add push subscription endpoint on backend
- [x] Implement push notification sending from backend (booking alerts)
- [x] Add notification permission prompt UI for PWA users
- [x] Handle push events in service worker
- [x] 13 tests passing for push notification system

## Feature: Auto-Trigger Push on Booking Events
- [x] Wire push notifications into booking confirmation flow (provider + customer)
- [x] Wire push into booking status updates (confirmed/completed/cancelled)
- [x] Wire push into booking reminder service (24hr reminders)
- [x] Wire push into new message notifications
- [x] Wire push into payment success/failure notifications (Stripe webhook)
- [x] Wire push into quote request/response/accept/decline notifications
- [x] Wire push into session reschedule flow
- [x] Created pushHelper.ts for easy push sending from any notification point

## Feature: PWA Badge Count
- [x] Add navigator.setAppBadge() hook (useBadgeCount)
- [x] BadgeManager component in main.tsx (inside tRPC provider)
- [x] Update badge on push event in service worker
- [x] Clear badge on notification click
- [x] Sync badge on visibility change (tab focus)

## Feature: Background Sync for Offline Actions
- [x] Create offlineQueue.ts module (enqueue/dequeue/replay with max 3 retries)
- [x] Create useOfflineActions hook for offline-aware mutations
- [x] Update service worker with Background Sync handler (ologycrew-sync-actions)
- [x] PendingActionsIndicator component for navbar
- [x] Fallback to online event replay when Background Sync API unavailable
- [x] 34 tests passing for all three features

## Feature: Push Notification Grouping
- [x] Group push notifications by type (booking, message, payment, quote, reminder)
- [x] Show summary notification (e.g., "3 new messages") when multiple arrive
- [x] Replace individual notifications with grouped summary after threshold (GROUP_THRESHOLD=2)
- [x] Clicking grouped notification opens relevant page
- [x] Close individual notifications when showing grouped summary
- [x] Include View All action on grouped notifications
- [x] Update badge count to account for grouped notifications
- [x] Add notification type to push payload for grouping support

## Feature: Offline Bookings Viewer
- [x] Wire useOfflineBookings hook into My Bookings page
- [x] Cache upcoming bookings to localStorage on each successful fetch
- [x] Show cached bookings with offline indicator when user is offline
- [x] Display "last synced" timestamp when viewing cached data
- [x] Offline banner with refresh button when online but showing cache
- [x] Disable destructive actions (cancel, message, export) when offline
- [x] Disable service/provider detail queries when offline
- [x] 35 tests passing for both features

## Bug: "Become a Provider" Link Goes to Browse
- [x] Fix "Become a Provider" button on homepage to navigate to provider registration instead of browse page

## Feature: Provider Onboarding Landing Copy
- [x] Add "Why become a provider?" hero section before onboarding form
- [x] Include key benefits (earnings, flexibility, tools, reach) — 6 benefit cards
- [x] Add platform stats/social proof section (42+ categories, 0% upfront, 1% fee, verified reviews)
- [x] Add "How it works" 4-step overview
- [x] Add "Get Started Free" CTA that reveals the onboarding form
- [x] Existing providers skip landing and go straight to onboarding form

## Feature: Conditional CTA for Existing Providers
- [x] Change "Become a Provider" on homepage to "Go to Dashboard" if logged-in user is already a provider

## Feature: Provider Testimonials Section
- [x] Add testimonials/quotes section to provider landing page with 3 placeholder success stories

## Feature: Provider FAQ Accordion
- [x] Add collapsible FAQ accordion to provider landing page (7 questions: cost, payouts, cancellation, categories, scheduling, mobile/location, verification)

## Feature: Provider Referral Program
- [x] Reuse existing referral_codes + referrals tables (no separate provider_referrals needed)
- [x] Unique referral code generation per user (works for both customer and provider referrals)
- [x] Referral link handling on provider onboarding page (?ref=CODE) with localStorage capture
- [x] Credit tracking when referred provider completes onboarding (applyCode mutation)
- [x] tRPC endpoints: getMyCode, validate, applyCode, getStats, getHistory, updateSettings, lookup
- [x] "Refer a Provider" section on provider dashboard (ReferProviderCard in More tab)
- [x] Dual-tab Referrals page with Customer Referrals and Provider Referrals tabs
- [x] Copy-to-clipboard referral link sharing (customer + provider links)
- [x] Share via Web Share API with fallback to clipboard
- [x] Tests for referral program endpoints (19 provider referral tests)

## Feature: Admin Dashboard Enhancements
- [x] Search within contact submissions (real-time text filter)
- [x] Bulk status actions for contact submissions (select all, bulk status update)
- [x] CSV export for contact submissions (download filtered results)
- [x] Push Notification Analytics tab (total/active/inactive subscriptions, unique users, 7-day growth)
- [x] Push adoption rate visualization with progress bar
- [x] Avg devices per user and recent growth metrics
- [x] Tests for admin enhancements (13 tests: push analytics, contact submissions, referral system, admin router)

## Feature: Referral Reward Fulfillment
- [x] Add referral_credits table to schema (earned/spent/expired types)
- [x] DB helpers: addReferralCredit, getReferralCreditBalance, getReferralCreditHistory, spendReferralCredits, fulfillReferralOnBookingComplete
- [x] referralFulfillment module to auto-complete referral + credit referrer on booking completion
- [x] Wire fulfillment into booking status update flow (on "completed")
- [x] Add getCreditBalance, getCreditHistory, spendCredits endpoints to referral router
- [x] Show credit balance on Referrals page (banner + stats card)
- [x] 34 tests for referral reward fulfillment

## Feature: Admin Referral Analytics
- [x] getReferralAnalytics DB helper (total codes, conversion rate, top referrers, monthly trend, credit summary)
- [x] Admin router endpoint: getReferralAnalytics
- [x] Referrals tab in admin dashboard with stats cards, credit summary, monthly trend, top referrers table
- [x] Conversion rate and active codes metrics

## Feature: Referral Email Notifications
- [x] Add referral_signup, referral_completed, referral_welcome notification types
- [x] Email templates for all three referral notification types
- [x] Wire referral_signup + referral_welcome into applyCode mutation
- [x] Wire referral_completed into booking completion flow (referralFulfillment module)
- [x] In-app notification for referrer when referral completes
- [x] Unsubscribe links included via existing notification service infrastructure

## Feature: Apply Credits at Checkout
- [x] Wire spendCredits into Stripe Checkout session creation (useCredits param)
- [x] previewCreditDiscount query endpoint for real-time discount preview
- [x] Show credit balance and toggle + discount preview in BookingConfirmation page
- [x] Reduce Stripe line item amount by credit amount before creating session
- [x] Record credit spend on successful payment (spendReferralCredits called before Stripe)
- [x] Handle edge cases: full credit payment (skip Stripe), partial credit, below $0.50 minimum
- [x] In-app notification for credit-paid bookings

## Feature: Credit Expiration Policy
- [x] Add expiresAt column to referral_credits table (90-day default for earned credits)
- [x] Scheduled job (creditExpiration.ts) runs every 24 hours to expire old credits
- [x] expireOldCredits DB helper marks expired earned credits as 'expired' type
- [x] getCreditsExpiringSoon DB helper for 7-day warning
- [x] Exclude expired credits from balance calculation (getReferralCreditBalance)
- [x] Show expiration date on credit history entries in Referrals page
- [x] Expiration warning banner when credits expire within 14 days
- [x] Scheduler wired into server startup (_core/index.ts)

## Feature: Referral Tier Rewards
- [x] Define 4-tier structure: Bronze (0-5, 10%), Silver (6-10, 15%), Gold (11-25, 20%), Platinum (26+, 25%)
- [x] REFERRAL_TIERS constant with name, minReferrals, maxReferrals, rewardPercent, color
- [x] getUserReferralTier DB helper calculates tier from completed referral count
- [x] getReferrerRewardPercent returns dynamic percentage for fulfillment
- [x] getMyTier and getNextExpiration tRPC endpoints in referral router
- [x] Tier progress card on Referrals page with all 4 tiers, progress bar, and next-tier indicator
- [x] Dynamic reward percentages shown throughout referral UI
- [x] 39 tests for all three features (credits at checkout, expiration, tiers)

## Feature: Referral Program Visibility
- [x] Add "Refer & Earn" section to homepage with 3-step process, tier preview, and CTA
- [x] Add credit balance badge to navigation header (Coins icon, links to /referrals)
- [x] Add Referral Credits link in mobile menu
- [x] Create public /referral-program landing page (hero, stats, how-it-works, tiers, benefits, FAQ, CTA)
- [x] Register /referral-program route in App.tsx
- [x] Link referral program page from homepage section
- [x] Handle object balance return type correctly in CreditBadge and ReferralProgram
- [x] 29 tests for referral visibility features

## Feature: Referral Visibility Enhancements (Round 2)
- [x] Post-booking "Share & Earn" card on BookingConfirmation page (3-step flow, copy/share, amber theme)
- [x] ShareReferralLink component with clipboard + Web Share API support
- [x] OG and Twitter Card meta tags on /referral-program (client-side useMetaTags hook)
- [x] Server-side OG meta tag injection in vite.ts (dev + production modes) for social media crawlers
- [x] Canonical link and document title management with cleanup on unmount
- [x] "Referral Program" link in site footer (Company column, before Help Center)
- [x] 32 tests for all three enhancements

## Feature: Referral Program OG Image
- [x] Generate branded 1200x630 social sharing image (navy gradient, gift box, tier badges, OlogyCrew branding)
- [x] Auto-uploaded to CDN (d2xsxph8kpxj0f.cloudfront.net)
- [x] Wire og:image + og:image:width/height + twitter:image into client-side useMetaTags hook
- [x] Wire og:image + twitter:image into server-side vite.ts injection (dev + production)
- [x] 40 tests passing (8 new OG image tests added to existing suite)

## Bug: Featured Providers "Provider Not Found"
- [x] Fixed: Homepage used `provider.slug` but data has `profileSlug`; updated link + auto-generate slug for providers missing one

## Bug: Provider Dashboard Not Showing for New Providers
- [x] Root cause: `provider.create` mutation did not update user role from 'customer' to 'provider'
- [x] Fix: Added `db.updateUserProfile(ctx.user.id, { role: "provider" })` to provider.create mutation
- [x] Fix: Added `role` field support to legacy `updateUserProfile` function in db-legacy.ts
- [x] Fix: NavHeader now checks both `user.role === 'provider'` AND `!!myProfile` (getMyProfile fallback)
- [x] Fix: ProviderOnboarding invalidates `auth.me` after profile creation so NavHeader updates immediately
- [x] Data fix: Updated 142 existing users with provider records but 'customer' role to 'provider'
- [x] 7 new tests in provider-role.test.ts (role update, slug generation, getMyProfile, duplicate prevention, categories, updateUserProfile role field)

## CRITICAL Feature: Post-Signup Role Selection Screen
- [x] Added `hasSelectedRole` boolean field to users table (default false for new signups)
- [x] Created `selectRole` mutation in authRouter (sets role + hasSelectedRole)
- [x] Created RoleSelection page — clean two-card UI ("Find & Book Services" vs "Offer My Services")
- [x] Created RoleGuard component — redirects authenticated users with hasSelectedRole=false to /select-role
- [x] Wired route in App.tsx and wrapped Router in RoleGuard
- [x] Provider.create also sets hasSelectedRole=true as fallback
- [x] Updated hasSelectedRole support in updateUserProfile (db-legacy.ts)
- [x] Data migration: set all existing users to hasSelectedRole=true, reset riquis95 to false
- [x] 5 tests in role-selection.test.ts (customer select, provider select, invalid role, default false, role change)

## Feature: OG Meta Tags for Provider Profile Pages
- [x] Created server/ogTags.ts helper — builds OG meta tags from provider data
- [x] Injects og:title, og:description, og:url, og:type, og:image, twitter:card for /p/:slug routes
- [x] Integrated into vite.ts for both dev (setupVite) and production (serveStatic) modes
- [x] HTML escaping for special characters in business names
- [x] Falls back to user profile photo or OlogyCrew logo for og:image
- [x] 4 tests in og-tags.test.ts (non-existent slug, existing provider, no description fallback, HTML escaping)

## Bug: Profile Page Mobile Layout Issues
- [x] Overlapping text on mobile profile page — moved Edit Profile button to its own row, added min-w-0 and truncate to name, flex-wrap on badge row
- [x] Edit profile button not looking clean on mobile — full-width on mobile (w-full sm:w-auto), on its own row below profile info
- [x] Form grid stacks to single column on mobile (grid-cols-1 sm:grid-cols-2)
- [x] Changed "Hover over photo" to "Tap photo" for mobile-friendly text
- [x] Added active:opacity-100 to camera overlay for touch devices

## Feature: Switch to Provider Option on Profile Page
- [x] Add "Become a Provider" card/section on profile page for customers
- [x] Clicking it navigates to /provider/onboarding
- [x] Only show for users with role='customer' (hide for existing providers)

## Feature: Profile Completion Indicator
- [x] Add progress bar showing profile completion percentage
- [x] Track fields: name (first+last), email, phone, profile photo
- [x] Show checklist of incomplete fields with actionable hints
- [x] Visual progress bar at top of profile page (hides when 100% complete)
- [x] "Complete Profile" button opens edit mode
- [x] 6 tests in profile-features.test.ts

## Feature: Provider/Customer View Switcher (Work, Live, Play)
- [x] Create ViewMode context to track current view (provider vs customer)
- [x] Add toggle/switcher UI in NavHeader for providers (pill-style toggle with icons)
- [x] Provider View shows: Dashboard link, provider-specific nav items
- [x] Customer View shows: Browse Services, Search, customer booking nav items (Dashboard hidden)
- [x] Persist view mode preference in localStorage
- [x] Both views always accessible — one account, two perspectives
- [x] Customers (non-providers) don't see the switcher
- [x] Mobile version with full-width toggle at top of mobile menu
- [x] ViewModeProvider wraps App in main.tsx
- [x] 11 tests passing (role-selection + profile-features)

## Bug: Book Button Offset on Mobile
- [x] Book button on service cards is clipped/cut off on right edge on mobile — fixed with flex-col sm:flex-row stacking and w-full sm:w-auto

## Bug: No Clear (X) Button in Search Field
- [x] Added X clear buttons on keyword and location inputs, plus "Clear All Filters" button

## Feature: Auto-Switch View Mode on Route Navigation
- [x] Auto-switch to Provider view when navigating to /provider/* routes
- [x] Auto-switch to Customer view when browsing/booking (/search, /browse, /service/*, /booking/*)

## Feature: Bookings Split by View Mode
- [x] Added "Bookings I Made" vs "Bookings I Received" pill toggle on MyBookings page
- [x] Customer bookings (listMine) vs provider bookings (listForProvider)
- [x] Only visible for providers (canSwitch check)

## Feature: Navigation Safety — No Dead-End Pages
- [x] Audit all pages/routes for navigation gaps (missing NavHeader, no back button, no breadcrumbs)
- [x] Create reusable PageHeader component with contextual back button and breadcrumbs
- [x] Add NavHeader + PageHeader to 11 pages: Referrals, PrivacyPolicy, TermsOfService, ProviderReviews, PublicProviderProfile, NotFound, SubmitReview, BookingAnalytics, CreateService, HelpCenter, ManageAvailability
- [x] Replaced custom headers in CreateService and ManageAvailability with consistent NavHeader + PageHeader
- [x] Every page now has NavHeader (logo links home, hamburger menu) and contextual breadcrumbs
- [x] 0 TypeScript errors

## Feature: Update Platform Documentation
- [x] Update Help Center FAQs with role selection flow
- [x] Update Help Center with Provider/Customer view switcher info
- [x] Update Help Center with bookings split (Made vs Received)
- [x] Update Help Center with Become a Provider from profile
- [x] Update Help Center with profile completion indicator
- [x] Update Help Center with navigation improvements (breadcrumbs, back buttons)
- [x] Update Help Center with search improvements (clear buttons)
- [x] Update Help Center with OG meta tags / social sharing info for providers

## Feature: Search by Provider/Business Name
- [x] Expand searchServices DB query to also match provider businessName via JOIN
- [x] Add searchProviders DB function to find providers by business name
- [x] Add provider.search tRPC endpoint returning matching providers
- [x] Read URL ?q= param in Search.tsx to pre-fill keyword from homepage
- [x] Show provider-level results section above service results
- [x] Show provider/business name on each service result card
- [x] Write tests for provider name search (10 tests passing)

## Bug Fix: Search Input Loses Focus After Each Keystroke
- [x] Diagnose root cause of search input losing focus on every keypress
- [x] Fix the focus loss issue so users can type continuously

## Feature: Debounce Search Queries
- [x] Add useDebounce hook for 300ms delay on search keyword
- [x] Apply debounced value to service and provider search queries
- [x] Keep instant UI feedback (input updates immediately, queries delayed)

## Bug Fix: Provider Profile Social Sharing Preview
- [x] Audit current OG meta tag setup for provider profile pages
- [x] Implement dynamic 1200x630 OG image generator using satori + resvg
- [x] OG image shows business name, description, location, rating, verified badge, profile photo
- [x] OG image cached in-memory with 24h TTL and uploaded to S3
- [x] Cache invalidation on provider profile update and photo upload
- [x] Fallback chain: generated OG image → profile photo → OlogyCrew logo
- [x] Full OG + Twitter Card meta tags with image dimensions
- [x] Tests passing (6 tests: empty slug, full tags, caching, invalidation, HTML escaping, fallback)

## Feature: Share Profile Button
- [x] Create ShareProfile component with dialog/popover
- [x] Copy Link button with one-click URL copying and toast confirmation
- [x] Social media share buttons: Facebook, Twitter/X, WhatsApp, LinkedIn
- [x] QR code generator for the profile URL
- [x] Email share option
- [x] Add Share button to PublicProviderProfile page
- [ ] Add Share button to provider's own dashboard/profile view

## Feature: OG Images for Service Pages
- [x] Create generateServiceOgImage function (1200x630 branded card)
- [x] Service OG image shows: service name, price, duration, provider name, category
- [x] Add getServiceOgTags function for /service/:id pages
- [x] Wire service OG tags into vite.ts server-side injection
- [x] Cache service OG images with invalidation on service update

## Feature: OG Tags for Homepage and Category Pages
- [x] Add homepage OG tags (site name, description, logo)
- [x] Add category page OG tags (/category/:slug with category name and description)
- [x] Wire homepage and category OG tags into vite.ts
- [x] All 13 OG tag tests passing (provider, service, category, homepage)

## Feature: Share Button on Provider Dashboard
- [x] Add Share Profile button to provider's own dashboard/profile management view
- [x] Reuse existing ShareProfile component with provider's public profile URL

## Feature: Share Service Button on Service Detail Pages
- [x] Reuse ShareProfile component for individual services with service-specific metadata
- [x] Add Share button to service detail page header next to rating badge
- [x] Include copy-link, social share (Facebook, X, WhatsApp, LinkedIn), and email options

## Feature: Branded Homepage OG Image
- [x] Generate a 1200x630 branded OG image with OlogyCrew tagline and 12 category chips
- [x] Update homepage OG tags to use the branded image with caching
- [x] All 13 OG tag tests passing

## Bug Fix: Share Dialog Layout Issues
- [x] Fix text overflow/overrun in Share dialog title and URL (truncated at 28 chars)
- [x] Fix social media buttons/images overrunning the dialog boundaries (overflow-hidden + flex justify-between)
- [x] Fix mobile responsiveness — responsive w-10/sm:w-11 buttons, proper padding
- [x] Ensure QR code tab is properly sized and doesn't overflow (180px centered)

## Bug Fix: Browse & Book Button on Provider Profile
- [x] Fix "Browse & Book" button to smooth-scroll to provider's services section instead of general browse page

## Feature: Smart Duration Display & Day Rate Support
- [x] Create shared formatDuration utility (min → "45 min", "2 hrs", "Full Day (10 hrs)")
- [x] Update all duration displays across the platform (10 files: CategoryDetail, EmbedBooking, MyQuotes, ProviderDashboard, ProviderOnboarding, PublicProviderProfile, Search, ServiceDetail, CreateService, BookingDetail)
- [x] Update service creation/edit forms to use DURATION_PRESETS dropdown (CreateService, ProviderDashboard edit, ProviderOnboarding, quote response)
- [x] Add "Day Rate" label for services 8+ hours (ServiceDetail price section + booking confirmation)
- [x] Ensure calendar/booking info displays correctly for day-rate services
- [x] Write 19 Vitest tests for formatDuration, getDurationPricingLabel, and DURATION_PRESETS

## Bug Fix: Day Rate Duration Selection Error
- [x] Investigate and fix error when selecting day rate (8+ hr) duration in service creation/editing
- [x] Root cause: empty strings sent for decimal columns (hourlyRate) — MySQL rejects empty string for decimal
- [x] Fix: convert empty strings to null for numeric fields (basePrice, hourlyRate, depositAmount, depositPercentage) in both service.create and service.update

## Bug Fix: Social Media Link Preview (OG Tags) for Provider Profiles
- [x] Investigated: Manus CDN pre-renders SPA pages and replaces server-injected OG tags with generic platform defaults
- [x] Created /api/og/:type/:id route that serves minimal HTML with proper OG tags (bypasses CDN)
- [x] Route supports provider, service, and category entities with auto-redirect to canonical SPA page
- [x] Updated ShareProfile component with shareUrl prop for social media sharing
- [x] Updated ProviderDashboard, PublicProviderProfile, ServiceDetail to pass shareUrl through /api/og/
- [x] Added meta refresh + JS redirect so human visitors are instantly redirected to the real page
- [x] Canonical URL in og:url points to the SPA page, not the /api/og/ route
- [x] Wrote 9 vitest tests for OG page route (all passing)
- [x] Verified correct OG tags served for Facebook, LinkedIn, and Twitter/X bots on dev server
## Bug Fix: Twitter/X Card Preview Not Showing
- [x] Confirmed: Twitter/X just takes longer to crawl new URLs — OG tags were correct all along

## Task: Update Provider Slug & Subscription Tier
- [x] Upgraded provider subscription from free to premium (active) for testing gated features
- [x] Changed provider slug from "test-service-provider-1" to "chisolm-audio"

## Bug Fix: Mobile Share & Slug Editor Issues
- [x] Copy Link on My Page tab now copies /api/og/ URL for proper social media previews in Messenger
- [x] ShareProfile Copy Link button also copies /api/og/ URL instead of SPA URL
- [x] Slug editor input field fixed for mobile iPhone — full-width, 16px font (prevents iOS zoom), stacked layout
- [x] Native share ("More sharing options") also uses /api/og/ URL

## New Category: Holistic Wellness Center
- [ ] Add Holistic Wellness Center category to the database
- [ ] Add appropriate services under the new category

## Bug Fix: 404 on "Go to Dashboard" Button
- [x] Fix 404 error when clicking "Go to Dashboard" on the homepage — link was /dashboard, changed to /provider/dashboard

## Bug Fix: Browse & Search Issues (Logged Out)
- [x] Browse Services page: disabled refetchOnWindowFocus globally to prevent loading flash on tab switch
- [x] Search not finding "Chisolm Audio": fixed price filter to include custom_quote services with null basePrice
- [x] Search auto-triggers on tab switch: disabled refetchOnWindowFocus globally in QueryClient config
- [x] Provider category names showing as null in search results: fixed getProviderCategories to JOIN with serviceCategories

## Bug Fix: Browse & Search Still Broken on Production
- [ ] Browse Services page shows "No categories found" when not signed in
- [ ] Search page auto-triggers search on page load without user input

## Task: Comprehensive Platform Documentation
- [x] Write PLATFORM_DOCS.md covering all architecture, schema, routes, APIs, components, tiers, integrations, and features
- [x] Document all 28 database tables with columns and relationships
- [x] Document all 38 application routes with auth requirements
- [x] Document all 22 tRPC routers with key procedures
- [x] Document all 24 DB helper files, 7 server modules, 8 Express routes
- [x] Document all 38 pages, 19 components, 7 shared components, 12 hooks, 2 contexts
- [x] Document 5 shared utilities (const, duration, shareUrl, timeSlots, types)
- [x] Document provider tiers (Free/Basic/Premium) and customer tiers (Free/Pro/Business)
- [x] Document all integrations (Stripe, Twilio, SSE, PWA, iCal, S3, OG tags, email)
- [x] Document complete feature inventory across 30+ development phases
- [x] Document all resolved bug fixes and known issues
- [x] Include service category appendix (42 categories) and test coverage summary (530+ tests, 51 files)

## Bug: Messages Navigation Redirects to My Bookings
- [x] Fix Messages icon/link in navbar redirecting to My Bookings instead of Messages page

## Feature: Start Conversation Button & Real-time SSE Messages
- [x] Add "Start Conversation" button on public provider profiles
- [x] Add "Start Conversation" button on booking detail pages (accessible via provider profile)
- [x] Implement real-time SSE updates for conversations inbox (instant refresh on new messages)
- [x] SSE "Live" indicator on conversations page
- [x] Reduced polling when SSE active (60s vs 15s fallback)
- [x] startConversation tRPC procedure for direct messaging without a booking
- [x] Message dialog with textarea, character counter, and send button
- [x] 10 tests passing for messageRouter (5 new startConversation tests)

## Feature: File/Image Attachments in Messages
- [x] Add file upload endpoint for message attachments (S3 storage)
- [x] Update message send procedure to accept attachment URL and metadata
- [x] Add attachment picker (paperclip icon) in chat UI with image preview
- [x] Display inline image/file attachments in message bubbles
- [x] Support image, PDF, and common document types
- [x] File size validation (max 10MB)

## Feature: Message Button on Booking Detail Pages
- [x] Add "Message" button on booking detail page for quick conversation access
- [x] Navigate directly to the booking's conversation thread

## Feature: Typing Indicators via SSE
- [x] Add typing event type to SSE manager
- [x] Add sendTyping tRPC procedure to messageRouter
- [x] Show "User is typing..." indicator in chat UI in real-time
- [x] Auto-clear typing indicator after timeout (4 seconds)
- [x] Debounce typing events from frontend (2-second throttle)

## Feature: Message Search
- [x] Add searchMessages tRPC procedure (keyword + optional date range)
- [x] Add search UI to Conversations inbox page (search bar + date filters)
- [x] Display search results with conversation context and highlighted matches
- [x] Navigate to specific message in conversation from search results

## Feature: Read Receipts
- [x] Update markAsRead to record readAt timestamp per message
- [x] Display single checkmark (delivered) / double checkmark (read) on sent messages
- [x] Show "Seen" timestamp on the last read message
- [x] Push read receipt events via SSE for real-time updates
- [x] 23 messageRouter tests passing (6 new for typing, read receipts, search)

## Bug: Production - Browse Services Empty for Unauthenticated Users
- [x] Browse Services confirmed working correctly for unauthenticated users (was intermittent backend issue)
- [x] Categories load via public procedure for all visitors

## Bug: Production - Search Auto-Triggers Without Input
- [x] Fix Search page auto-triggering search without user input
- [x] Search only fires when user enters query or adjusts filters
- [x] Shows friendly "Search for Services" welcome state on initial load

# OlogyCrew Service Scheduling Platform — Comprehensive Documentation

**Version:** MVP Golden Path (April 2026)
**Production URL:** [servsched-qd7ehrqo.manus.space](https://servsched-qd7ehrqo.manus.space)
**Owner:** Gary Chisolm — Chisolm Audio — garychisolm30@gmail.com — (678) 525-0891
**Test Suite:** 530+ tests across 51 test files

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Application Routes](#5-application-routes)
6. [API Reference — tRPC Routers](#6-api-reference--trpc-routers)
7. [Server Modules](#7-server-modules)
8. [Client Components](#8-client-components)
9. [Shared Utilities](#9-shared-utilities)
10. [Subscription Tiers](#10-subscription-tiers)
11. [Integrations](#11-integrations)
12. [Feature Inventory](#12-feature-inventory)
13. [Bug Fixes & Known Issues](#13-bug-fixes--known-issues)
14. [Marketing Assets](#14-marketing-assets)

---

## 1. Platform Overview

OlogyCrew is a full-stack, multi-vendor service scheduling platform that connects customers with service providers across **42+ categories** — from Audio Visual Crew and Barber Shops to Cybersecurity Services and Website Production. The platform enables freelancers and small businesses to manage schedules, set flexible pricing, accept bookings, process payments through Stripe, and grow their client base through a public mini-website profile.

The platform operates on a **dual-subscription revenue model**: providers pay monthly subscriptions (Free/Basic/Premium) for premium features, and the platform takes a **1% transaction fee** on every booking. Customers can also subscribe (Free/Pro/Business) for perks like unlimited saved providers, bulk quotes, and booking analytics.

OlogyCrew is a **Progressive Web App (PWA)** with offline support, push notifications, background sync, and installable on mobile devices. Real-time updates are delivered via **Server-Sent Events (SSE)**, and the messaging system supports booking-threaded conversations with email and SMS notifications via Twilio.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19 |
| Styling | Tailwind CSS | 4 |
| UI Components | shadcn/ui | Latest |
| Routing | Wouter | Latest |
| State/Data | TanStack Query + tRPC | 11 |
| Backend | Express | 4 |
| API Layer | tRPC | 11 |
| ORM | Drizzle ORM | Latest |
| Database | MySQL / TiDB | Cloud |
| Payments | Stripe (Checkout + Connect) | Latest |
| SMS | Twilio | Latest |
| File Storage | AWS S3 (via Manus Forge) | — |
| Authentication | Manus OAuth + JWT | — |
| Testing | Vitest | Latest |
| Build Tool | Vite | Latest |
| Runtime | Node.js | 22.13.0 |
| Package Manager | pnpm | Latest |

---

## 3. Architecture

### 3.1 Directory Structure

```
service-scheduling-platform/
├── client/                    # Frontend SPA
│   ├── public/                # Static assets (manifest, icons, service worker)
│   ├── src/
│   │   ├── pages/             # 38 page-level components
│   │   ├── components/        # 19 reusable components
│   │   │   ├── shared/        # 7 shared UI components
│   │   │   └── ui/            # shadcn/ui primitives
│   │   ├── hooks/             # 12 custom React hooks
│   │   ├── contexts/          # 2 React contexts
│   │   ├── lib/               # tRPC client binding
│   │   ├── App.tsx            # Route definitions
│   │   ├── main.tsx           # App entry + providers
│   │   └── index.css          # Global theme + Tailwind
│   └── index.html             # HTML shell
├── server/                    # Backend
│   ├── _core/                 # Framework plumbing (OAuth, context, Vite bridge)
│   ├── routers/               # 9 domain-specific tRPC routers
│   ├── db/                    # 24 domain-specific DB helper files
│   ├── routers.ts             # Main appRouter merge file
│   ├── db.ts → db-legacy.ts   # Legacy shim (backward compat)
│   ├── *.ts                   # 13 standalone routers + services
│   └── *.test.ts              # 51 test files
├── drizzle/                   # Database schema + migrations
│   └── schema.ts              # 28 tables
├── shared/                    # Shared between client & server
│   ├── const.ts               # Cookie name, error messages
│   ├── duration.ts            # formatDuration, DURATION_PRESETS
│   ├── shareUrl.ts            # OG share URL builder
│   ├── timeSlots.ts           # Time slot generation
│   └── types.ts               # Re-exported schema types
├── storage/                   # S3 helpers
├── todo.md                    # Feature tracking (930 lines)
└── PLATFORM_DOCS.md           # This document
```

### 3.2 Data Flow

All data flows through a single tRPC pipeline:

1. **Client** calls `trpc.<router>.<procedure>.useQuery()` or `.useMutation()`
2. **tRPC** routes the call to the appropriate procedure in `server/routers.ts`
3. **Procedure** validates input (Zod), checks auth (`protectedProcedure` vs `publicProcedure`), and calls DB helpers
4. **DB Helpers** in `server/db/` execute Drizzle ORM queries against TiDB/MySQL
5. **Response** flows back through tRPC with full type safety (Superjson serialization preserves `Date` objects)

Non-tRPC Express routes handle: Stripe webhooks, Twilio SMS webhooks, iCal feeds, OG tag pages, analytics PDF export, and SSE notifications.

### 3.3 Authentication Flow

Authentication uses Manus OAuth with JWT session cookies:

1. User clicks "Log In" → redirected to Manus OAuth portal
2. OAuth callback at `/api/oauth/callback` drops a signed JWT session cookie
3. Every `/api/trpc` request builds context via `server/_core/context.ts`, injecting `ctx.user`
4. `protectedProcedure` enforces authentication; `publicProcedure` allows anonymous access
5. Role-based access: `customer`, `provider`, `admin` — checked via `ctx.user.role`
6. New users see a **Role Selection Screen** (`hasSelectedRole` flag) before accessing the platform

---

## 4. Database Schema

The database contains **28 tables** organized into logical domains. All timestamps are stored in UTC.

### 4.1 Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | User accounts (all roles) | id, openId, name, email, role (customer/provider/admin), firstName, lastName, phone, profilePhotoUrl, hasSelectedRole, emailVerified |
| `service_providers` | Provider business profiles | id, userId (FK→users), businessName, businessType, description, city/state, averageRating, totalReviews, verificationStatus, profileSlug, stripeAccountId, stripeAccountStatus, isOfficial, isFeatured |
| `service_categories` | 42 predefined categories | id, name, slug, description, isMobileEnabled, isFixedLocationEnabled, isVirtualEnabled, sortOrder |
| `provider_categories` | Many-to-many: providers ↔ categories | providerId (FK), categoryId (FK), isActive |

### 4.2 Service & Pricing Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `services` | Individual service offerings | id, providerId (FK), categoryId (FK), name, serviceType (mobile/fixed/virtual/hybrid), pricingModel (fixed/hourly/package/custom_quote), basePrice, hourlyRate, durationMinutes, depositRequired, depositType, depositAmount, depositPercentage, bufferTimeMinutes |
| `service_photos` | Photos attached to services | serviceId (FK), photoUrl, caption, sortOrder, isPrimary |
| `service_packages` | Bundled service packages | providerId (FK), name, packagePrice, originalPrice, durationMinutes |
| `package_items` | Services within a package | packageId (FK), serviceId (FK), sortOrder |

### 4.3 Booking Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `bookings` | All booking records | id, bookingNumber, customerId (FK), providerId (FK), serviceId (FK), bookingDate, startTime, endTime, status (pending/confirmed/in_progress/completed/cancelled/no_show/refunded), bookingType (single/multi_day/recurring), endDate, totalDays, recurrenceFrequency, locationType, subtotal, platformFee, totalAmount, bookingSource (direct/embed_widget/provider_page/api/quote), quoteRequestId |
| `booking_sessions` | Individual sessions for multi-day/recurring | bookingId (FK), sessionDate, startTime, endTime, sessionNumber, status (scheduled/completed/cancelled/rescheduled/no_show), rescheduledToSessionId, rescheduledFromDate |
| `payments` | Payment records | bookingId (FK), paymentType (deposit/final/full/refund), amount, status, stripePaymentIntentId, stripeChargeId |

### 4.4 Availability Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `availability_schedules` | Weekly recurring schedule | providerId (FK), dayOfWeek (0-6), startTime, endTime, isAvailable, locationType, maxConcurrentBookings |
| `availability_overrides` | Date-specific overrides/blocks | providerId (FK), overrideDate, startTime, endTime, isAvailable, reason |

### 4.5 Communication Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `messages` | Booking-threaded messages | conversationId, bookingId (FK), senderId (FK), recipientId (FK), messageText, attachmentUrl, isRead |
| `notifications` | In-app notifications | userId (FK), notificationType, title, message, actionUrl, relatedBookingId, isRead, isSentEmail, isSentSms |
| `notification_preferences` | Per-user channel/type toggles | userId (FK), emailEnabled, smsEnabled, pushEnabled, bookingEmail, reminderEmail, messageEmail, paymentEmail, marketingEmail, bookingSms, reminderSms, unsubscribeToken |
| `push_subscriptions` | Web Push subscription data | userId (FK), endpoint, p256dh, auth, userAgent, isActive |

### 4.6 Review & Verification Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `reviews` | Customer reviews of providers | bookingId (FK), customerId (FK), providerId (FK), rating (1-5), reviewText, responseText, isVerifiedBooking, isFeatured, isFlagged |
| `verification_documents` | Provider identity/license docs | providerId (FK), documentType (identity/business_license/insurance/background_check), documentUrl, verificationStatus (pending/approved/rejected) |

### 4.7 Subscription Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `provider_subscriptions` | Provider tier management | providerId (FK), tier (free/basic/premium), status, stripeSubscriptionId, currentPeriodStart/End |
| `customer_subscriptions` | Customer tier management | userId (FK), tier (free/pro/business), status, stripeSubscriptionId, currentPeriodStart/End |

### 4.8 Promo & Referral Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `promo_codes` | Provider-created discount codes | providerId, code, discountType (percentage/fixed), discountValue, maxRedemptions, validFrom, validUntil, codeType (promo/referral) |
| `promo_redemptions` | Promo code usage tracking | promoCodeId, userId, bookingId, discountAmount |
| `referral_codes` | User referral codes (REF-XXXXXX) | userId (FK), code, referrerDiscountPercent, refereeDiscountPercent, maxReferrals |
| `referrals` | Referral tracking records | referralCodeId (FK), referrerId (FK), refereeId (FK), refereeBookingId, status (pending/completed/expired) |
| `referral_credits` | Earned/spent/expired credits | userId (FK), amount, type (earned/spent/expired), referralId, bookingId, expiresAt |

### 4.9 Other Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `portfolio_items` | Provider work samples | providerId (FK), categoryId, title, imageUrl, mediaType (image/before_after), beforeImageUrl |
| `customer_favorites` | Saved providers | userId (FK), providerId (FK), folderId |
| `saved_provider_folders` | Organize favorites into folders | userId (FK), name, color, icon, sortOrder |
| `quote_requests` | Quote request flow | customerId, providerId, serviceId, title, description, preferredDate, quotedAmount, status (pending/quoted/accepted/declined/expired/booked), batchId |
| `contact_submissions` | Help Center contact form | name, email, subject, category, message, status (new/in_progress/resolved/closed) |
| `contact_replies` | Admin replies to contacts | submissionId (FK), adminUserId (FK), message, templateId, emailSent |
| `reply_templates` | Canned admin response templates | name, category, subject, body, usageCount |

---

## 5. Application Routes

The application registers **38 routes** in `client/src/App.tsx` via Wouter. All routes are wrapped in a `RoleGuard` that redirects new users to `/select-role` if they have not yet chosen a role.

### 5.1 Public Routes

| Path | Component | Description |
|---|---|---|
| `/` | Home | Landing page with hero, featured providers, category grid, referral section, CTA |
| `/browse` | Browse | Browse all 42 service categories with provider counts |
| `/search` | Search | Full-text search for services and providers with filters (price, rating, location, type) |
| `/category/:slug` | CategoryDetail | Browse providers and services within a specific category |
| `/service/:id` | ServiceDetail | Service detail page with booking flow, pricing, reviews, share button |
| `/p/:slug` | PublicProviderProfile | Provider mini-website with bio, services, portfolio, packages, reviews |
| `/pricing` | CustomerPricing | Customer subscription tier comparison (Free/Pro/Business) |
| `/privacy` | PrivacyPolicy | Privacy policy including SMS data practices |
| `/terms` | TermsOfService | Terms of service with SMS program details |
| `/help` | HelpCenter | Searchable help articles, FAQ, contact form |
| `/referral-program` | ReferralProgram | Public referral program landing page with tier info |
| `/select-role` | RoleSelection | Post-signup role selection (customer vs provider) |
| `/unsubscribe/:token` | Unsubscribe | One-click email unsubscribe |
| `/embed/book/:serviceId` | EmbedBooking | Embeddable booking widget (iframe) for a specific service |
| `/embed/provider/:providerId` | EmbedBooking | Embeddable booking widget for all provider services |
| `/404` | NotFound | 404 error page |

### 5.2 Customer Routes (Authenticated)

| Path | Component | Auth | Description |
|---|---|---|---|
| `/my-bookings` | MyBookings | Required | Customer bookings dashboard with "Made" vs "Received" toggle for providers |
| `/booking/:id` | BookingConfirmation | Required | Booking confirmation and payment flow |
| `/booking/:id/detail` | BookingDetail | Required | Detailed booking view with session management, calendar add |
| `/booking/:id/review` | SubmitReview | Required | Submit a review for a completed booking |
| `/messages/:bookingId` | Messages | Required | Booking-threaded messaging conversation |
| `/my-quotes` | MyQuotes | Required | Customer quote requests and responses |
| `/saved-providers` | SavedProviders | Required | Saved/favorited providers with folders (tier-gated) |
| `/analytics` | BookingAnalytics | Required | Booking spending analytics (Business tier only) |
| `/referrals` | Referrals | Required | Referral dashboard with code sharing, stats, credit balance, tier progress |
| `/notifications` | Notifications | Required | Full notification center |
| `/notification-settings` | NotificationSettings | Required | Per-channel/type notification preferences |
| `/profile` | UserProfile | Required | User profile with photo, completion indicator, edit form |

### 5.3 Provider Routes (Authenticated + Provider Role)

| Path | Component | Auth | Description |
|---|---|---|---|
| `/provider/dashboard` | ProviderDashboard | Provider | Main dashboard with 6 tabs: Bookings, Services, Schedule, Finances, My Page, More |
| `/provider/onboarding` | ProviderOnboarding | Required | 4-step onboarding wizard (photo → categories → services → Stripe) |
| `/provider/services/new` | CreateService | Provider | Create a new service with pricing, duration, photos |
| `/provider/availability` | ManageAvailability | Provider | Weekly schedule + date overrides/blocks |
| `/provider/calendar` | ProviderCalendar | Provider | Month/week calendar view of bookings and sessions |
| `/provider/subscription` | SubscriptionManagement | Provider | Provider subscription tier management |
| `/provider/widgets` | WidgetGenerator | Provider | Embeddable booking widget code generator |
| `/provider/promo-codes` | PromoCodes | Provider | Promo code CRUD with analytics |
| `/provider/reviews` | ProviderReviews | Provider | View and respond to customer reviews |

### 5.4 Admin Routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/admin` | AdminDashboard | Admin | Platform admin panel: users, providers, transactions, analytics, verification, reviews, contacts, push analytics, referral analytics |

---

## 6. API Reference — tRPC Routers

The backend exposes **22 tRPC routers** merged into a single `appRouter`. Each router groups related procedures.

### 6.1 Core Routers (in `server/routers/`)

| Router | Namespace | Key Procedures |
|---|---|---|
| **authRouter** | `auth.*` | `me` (get current user), `logout`, `selectRole` (post-signup role choice) |
| **providerRouter** | `provider.*` | `create`, `getMyProfile`, `updateProfile`, `updateSlug`, `uploadPhoto`, `search` (by business name), `getBySlug` |
| **categoryRouter** | `category.*` | `list`, `getBySlug`, `listWithCounts` |
| **serviceRouter** | `service.*` | `create`, `update`, `delete`, `getById`, `listByProvider`, `listByCategory`, `search` (full-text with provider name JOIN) |
| **bookingRouter** | `booking.*` | `create`, `createMultiDay`, `createRecurring`, `updateStatus`, `listMine`, `listForProvider`, `getById`, `cancel`, `calendarEvents` |
| **reviewRouter** | `review.*` | `create`, `listByProvider`, `respond`, `getForBooking` |
| **messageRouter** | `message.*` | `send`, `listByBooking`, `markAsRead`, `getConversations` |
| **notificationRouter** | `notification.*` | `list`, `markAsRead`, `markAllAsRead`, `getUnreadCount`, `updatePreferences`, `getPreferences` |
| **availabilityRouter** | `availability.*` | `getSchedule`, `updateSchedule`, `getOverrides`, `addOverride`, `deleteOverride`, `getNextAvailable` |

### 6.2 Standalone Routers (in `server/`)

| Router | Namespace | Key Procedures |
|---|---|---|
| **stripeRouter** | `stripe.*` | `createCheckoutSession`, `getPaymentStatus` |
| **stripeConnectRouter** | `stripeConnect.*` | `createAccountLink`, `getAccountStatus`, `getBalance`, `getDashboardLink` |
| **subscriptionRouter** | `subscription.*` | `getMySubscription`, `createCheckout`, `createPortalSession`, `getTiers` |
| **customerSubscriptionRouter** | `customerSubscription.*` | `getSubscription`, `getTiers`, `createCheckout`, `createPortalSession`, `canSaveMore` |
| **adminRouter** | `admin.*` | `listUsers`, `listProviders`, `approveProvider`, `rejectProvider`, `getAnalytics`, `getSubscriptionAnalytics`, `moderateReview`, `listVerificationDocs`, `reviewDocument`, `triggerReviewReminders`, `getPushAnalytics`, `getReferralAnalytics` |
| **widgetRouter** | `widget.*` | `getConfig`, `getServices` |
| **promoRouter** | `promo.*` | `create`, `update`, `delete`, `list`, `validate`, `getAnalytics` |
| **verificationRouter** | `verification.*` | `upload`, `list`, `delete` |
| **referralRouter** | `referral.*` | `getMyCode`, `validate`, `applyCode`, `getStats`, `getHistory`, `updateSettings`, `lookup`, `getCreditBalance`, `getCreditHistory`, `spendCredits`, `getMyTier`, `getNextExpiration`, `previewCreditDiscount` |
| **foldersRouter** | `folders.*` | `create`, `update`, `delete`, `list`, `moveToFolder`, `removeFromFolder` |
| **contactRouter** | `contact.*` | `submit`, `list` (admin), `updateStatus` (admin), `reply` (admin), `listTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate` |
| **pushRouter** | `push.*` | `subscribe`, `unsubscribe`, `getSubscription` |
| **systemRouter** | `system.*` | `notifyOwner` |

---

## 7. Server Modules

Beyond tRPC routers, the server includes standalone modules for specific functionality.

### 7.1 Database Helpers (`server/db/`)

The database layer is split into **24 domain-specific files** for maintainability:

| File | Domain | Key Functions |
|---|---|---|
| `users.ts` | User management | getUserById, updateUserProfile, getUserByOpenId |
| `providers.ts` | Provider profiles | getProviderByUserId, updateProvider, listFeatured, getProviderBySlug |
| `services.ts` | Service catalog | searchServices, searchProviders, getProviderCategories, listByCategory |
| `bookings.ts` | Booking CRUD | createBooking, updateBookingStatus, listCustomerBookings, listProviderBookings |
| `bookingSessions.ts` | Multi-day/recurring sessions | createSessions, getSessionById, rescheduleSession, createSingleSession |
| `availability.ts` | Schedule management | getWeeklySchedule, updateSchedule, getOverrides, addOverride |
| `payments.ts` | Payment records | createPayment, getPaymentsByBooking |
| `reviews.ts` | Review system | createReview, listByProvider, updateProviderRating |
| `messages.ts` | Messaging | sendMessage, listByBooking, getConversations, markAsRead |
| `notifications.ts` | Notification system | createNotification, listForUser, markAsRead (auto-pushes SSE events) |
| `analytics.ts` | Platform analytics | getBookingAnalytics, getRevenueAnalytics, getUserGrowth |
| `customerAnalytics.ts` | Customer spending | getCustomerSpendingSummary, getMonthlySpending, getTopProviders, getCategoryBreakdown |
| `customerSubscriptions.ts` | Customer tiers | getSubscription, createSubscription, updateSubscription |
| `favorites.ts` | Saved providers | toggleFavorite, listFavorites, checkFavorite |
| `folders.ts` | Saved provider folders | createFolder, updateFolder, deleteFolder, moveToFolder |
| `packages.ts` | Service packages | createPackage, listByProvider, deletePackage |
| `portfolio.ts` | Work samples | createItem, listByProvider, deleteItem |
| `promo.ts` | Promo codes | createPromo, validatePromo, redeemPromo |
| `quotes.ts` | Quote requests | createQuoteRequest, respondToQuote, updateQuoteStatus |
| `referrals.ts` | Referral system | createReferralCode, applyCode, getReferralStats, addReferralCredit, spendReferralCredits, getUserReferralTier |
| `verification.ts` | Document verification | uploadDocument, listDocuments, reviewDocument |
| `contactSubmissions.ts` | Contact form | createSubmission, listSubmissions, updateStatus, createReply |
| `connection.ts` | DB connection pool | Drizzle ORM connection setup |
| `index.ts` | Barrel exports | Re-exports all DB helpers |

### 7.2 Express Routes (Non-tRPC)

| Route | File | Purpose |
|---|---|---|
| `POST /api/stripe/webhook` | `stripeWebhook.ts` | Stripe webhook handler (checkout, payments, refunds, subscriptions) |
| `POST /api/twilio/sms` | `twilioSmsWebhook.ts` | Twilio incoming SMS webhook (STOP/START/HELP opt-out/in) |
| `GET /api/calendar/:providerId/feed.ics` | `calendarFeed.ts` | iCal feed for provider bookings (webcal:// compatible) |
| `GET /api/calendar/booking/:id.ics` | `calendarFeed.ts` | Individual booking .ics download |
| `GET /api/sse/notifications` | `sseManager.ts` | Server-Sent Events for real-time notifications |
| `GET /api/og/:type/:id` | `ogPageRoute.ts` | OG meta tag pages for social media crawlers |
| `GET /api/export/analytics/pdf` | `analyticsExport.ts` | PDF analytics report generation (Business tier) |
| `GET /api/export/bookings/csv` | `bookingExport.ts` | CSV booking history export (Business tier) |

### 7.3 Background Services

| Module | File | Schedule | Purpose |
|---|---|---|---|
| Booking Reminder | `reminderService.ts` | 30-min interval | Sends 24-hour booking reminders via email/SMS/push |
| Review Reminder | `reviewReminderService.ts` | 30-min interval | Sends review prompts 24h after completed bookings |
| Credit Expiration | `referralFulfillment.ts` | 24-hour interval | Expires referral credits older than 90 days |

### 7.4 SSE Manager

The `sseManager.ts` module implements a singleton `SSEManager` for real-time push:

- Maintains active SSE connections per user (supports multi-tab)
- Sends heartbeat pings every 30 seconds
- Auto-triggered when `createNotification` is called (both `db-legacy` and `db/notifications`)
- Client-side `useSSE` hook handles reconnection with exponential backoff (1s to 30s max)
- Falls back to polling when SSE is unavailable

---

## 8. Client Components

### 8.1 Pages (38 files in `client/src/pages/`)

Each page is a self-contained React component that uses tRPC hooks for data fetching and mutations. All pages include `NavHeader` for consistent navigation and `PageHeader` for contextual breadcrumbs.

| Page | File | Description |
|---|---|---|
| AdminDashboard | `AdminDashboard.tsx` | Multi-tab admin panel (users, providers, transactions, analytics, verification, reviews, contacts, push analytics, referral analytics) |
| BookingAnalytics | `BookingAnalytics.tsx` | Customer spending analytics with charts, export (Business tier) |
| BookingConfirmation | `BookingConfirmation.tsx` | Step-by-step booking flow (date → time → details → confirm → pay) with promo codes, referral credits, multi-day/recurring support |
| BookingDetail | `BookingDetail.tsx` | Detailed booking view with session management, calendar add, status updates |
| Browse | `Browse.tsx` | Category grid with provider counts and search |
| CategoryDetail | `CategoryDetail.tsx` | Provider cards within a category with filters (price, rating, location, type) |
| ComponentShowcase | `ComponentShowcase.tsx` | Internal UI component showcase (dev only) |
| CreateService | `CreateService.tsx` | Service creation form with DURATION_PRESETS dropdown, pricing models, photo upload |
| CustomerPricing | `CustomerPricing.tsx` | Customer subscription tier comparison with Stripe checkout |
| EmbedBooking | `EmbedBooking.tsx` | Embeddable booking widget for iframe/popup integration |
| HelpCenter | `HelpCenter.tsx` | Searchable help articles (29 articles), FAQ (15 items), contact form |
| Home | `Home.tsx` | Landing page with hero, featured providers, categories, referral section |
| ManageAvailability | `ManageAvailability.tsx` | Weekly schedule editor + date override/block manager |
| Messages | `Messages.tsx` | Real-time messaging interface threaded by booking |
| MyBookings | `MyBookings.tsx` | Customer bookings with "Made" vs "Received" toggle, export (CSV/PDF) |
| MyQuotes | `MyQuotes.tsx` | Quote requests with accept/decline, "View Booking" for converted quotes |
| NotFound | `NotFound.tsx` | 404 error page |
| NotificationSettings | `NotificationSettings.tsx` | Per-channel/type notification preference toggles |
| Notifications | `Notifications.tsx` | Full notification center with mark-as-read |
| PrivacyPolicy | `PrivacyPolicy.tsx` | Privacy policy with SMS section |
| PromoCodes | `PromoCodes.tsx` | Provider promo code CRUD with usage analytics |
| ProviderCalendar | `ProviderCalendar.tsx` | Month/week calendar view with color-coded status events |
| ProviderDashboard | `ProviderDashboard.tsx` | 6-tab dashboard: Bookings, Services, Schedule, Finances, My Page, More |
| ProviderOnboarding | `ProviderOnboarding.tsx` | 4-step wizard with landing page, progress bar, deep-link support |
| ProviderReviews | `ProviderReviews.tsx` | View and respond to customer reviews |
| PublicProviderProfile | `PublicProviderProfile.tsx` | Provider mini-website with services, portfolio, packages, reviews |
| ReferralProgram | `ReferralProgram.tsx` | Public referral program landing page with tier info and OG tags |
| Referrals | `Referrals.tsx` | Dual-tab referral dashboard (customer + provider referrals), credit balance, tier progress |
| RoleSelection | `RoleSelection.tsx` | Post-signup role choice (customer vs provider) |
| SavedProviders | `SavedProviders.tsx` | Saved providers with folders, usage bar, tier badge, bulk quote button |
| Search | `Search.tsx` | Full-text search with debounce, provider + service results, filters |
| ServiceDetail | `ServiceDetail.tsx` | Service page with booking flow, reviews, share button, day rate label |
| SubmitReview | `SubmitReview.tsx` | Review submission form for completed bookings |
| SubscriptionManagement | `SubscriptionManagement.tsx` | Provider subscription tier management |
| TermsOfService | `TermsOfService.tsx` | Terms of service with SMS program details |
| Unsubscribe | `Unsubscribe.tsx` | One-click email unsubscribe handler |
| UserProfile | `UserProfile.tsx` | Profile with photo upload, completion indicator, "Become a Provider" card |
| WidgetGenerator | `WidgetGenerator.tsx` | Embeddable booking widget code generator (iframe, popup, direct link) |

### 8.2 Reusable Components (19 files in `client/src/components/`)

| Component | Purpose |
|---|---|
| `AIChatBox.tsx` | Full-featured chat interface (template component, not currently used) |
| `BadgeManager.tsx` | PWA badge count sync (unread notifications → app badge) |
| `BulkQuoteModal.tsx` | Bulk quote request modal for Business tier customers |
| `DashboardLayout.tsx` | Sidebar dashboard layout (template component) |
| `DashboardLayoutSkeleton.tsx` | Loading skeleton for dashboard |
| `DevToolsPanel.tsx` | Development tools panel |
| `ErrorBoundary.tsx` | React error boundary with fallback UI |
| `ManusDialog.tsx` | Custom dialog component |
| `Map.tsx` | Google Maps integration via Manus proxy |
| `OfficialBadge.tsx` | "Official" badge for OlogyCrew's own provider account |
| `OfflineBanner.tsx` | Offline status indicator banner |
| `PWAInstallBanner.tsx` | PWA install prompt UI |
| `PendingActionsIndicator.tsx` | Navbar indicator for queued offline actions |
| `PhotoUpload.tsx` | Photo upload component with S3 integration |
| `PushNotificationSettings.tsx` | Push notification permission prompt |
| `RoleGuard.tsx` | Route guard redirecting users without role selection |
| `ShareProfile.tsx` | Share dialog with copy link, social media (Facebook, X, WhatsApp, LinkedIn, Email), QR code |
| `UpgradeModal.tsx` | Subscription upgrade prompt with tier comparison |
| `ViewModeSwitcher.tsx` | Provider/Customer view toggle (pill-style) |

### 8.3 Shared Components (7 files in `client/src/components/shared/`)

| Component | Purpose |
|---|---|
| `EmptyState.tsx` | Empty state placeholder with icon and message |
| `LoadingSpinner.tsx` | Loading spinner animation |
| `NavHeader.tsx` | Global navigation header with logo, links, user menu, view mode switcher, credit badge, notification bell |
| `PageHeader.tsx` | Contextual page header with breadcrumbs and back button |
| `ReviewCard.tsx` | Individual review display card |
| `ReviewList.tsx` | Paginated review list |
| `StatusBadge.tsx` | Color-coded status badge (booking, session, verification statuses) |

### 8.4 Custom Hooks (12 files in `client/src/hooks/`)

| Hook | Purpose |
|---|---|
| `useBadgeCount.ts` | Manages PWA app badge count via `navigator.setAppBadge()` |
| `useBookingDetails.ts` | Fetches and formats booking detail data |
| `useComposition.ts` | Handles IME composition events for CJK input |
| `useDebounce.ts` | Generic debounce hook (used for 300ms search delay) |
| `useOfflineActions.ts` | Offline-aware mutations with queue and retry |
| `useOfflineBookings.ts` | Caches bookings to localStorage for offline viewing |
| `usePWAInstall.ts` | PWA install prompt management |
| `usePayment.ts` | Stripe payment flow management |
| `usePersistFn.ts` | Persists function reference across renders |
| `useProtectedPage.ts` | Redirects unauthenticated users to login |
| `usePushNotifications.ts` | Web Push subscription management |
| `useSSE.ts` | Server-Sent Events connection with reconnection logic |

### 8.5 Contexts (2 files in `client/src/contexts/`)

| Context | Purpose |
|---|---|
| `ThemeContext.tsx` | Light/dark theme management |
| `ViewModeContext.tsx` | Provider/Customer view mode with localStorage persistence and auto-switch on route navigation |

---

## 9. Shared Utilities

The `shared/` directory contains code used by both client and server:

| File | Exports | Description |
|---|---|---|
| `const.ts` | `COOKIE_NAME`, `ONE_YEAR_MS`, `AXIOS_TIMEOUT_MS`, `UNAUTHED_ERR_MSG`, `NOT_ADMIN_ERR_MSG` | Application constants |
| `duration.ts` | `formatDuration()`, `getDurationPricingLabel()`, `DURATION_PRESETS` | Smart duration formatting: converts minutes to human-readable strings ("45 min", "2 hrs", "Full Day (10 hrs)"). 16 preset options from 15 min to 12 hours. Returns "Day Rate" label for 8+ hour services. |
| `shareUrl.ts` | `getShareUrl()`, `getCanonicalUrl()` | Builds `/api/og/` share URLs that bypass Manus CDN pre-rendering for proper social media previews. Supports provider, service, and category entities. |
| `timeSlots.ts` | `generateTimeSlots()`, `isTimeSlotAvailable()`, `formatTimeForDisplay()`, `getDateRange()` | Time slot generation engine: combines weekly schedules with date overrides and existing bookings to produce available time slots. |
| `types.ts` | All schema types | Re-exports all Drizzle schema types for shared use |

---

## 10. Subscription Tiers

### 10.1 Provider Tiers

Providers subscribe to unlock premium features. The platform charges a **1% transaction fee** on all bookings regardless of tier.

| Feature | Starter (Free) | Professional ($19.99/mo) | Business ($49.99/mo) |
|---|---|---|---|
| Active services | 3 | 10 | Unlimited |
| Photos per service | 2 | 5 | 5 |
| Custom profile URL slug | — | Yes | Yes |
| Priority search placement | — | Yes | Top placement |
| Analytics dashboard | — | Yes | Full suite |
| Custom branding | — | — | Yes |
| Featured listing badge | — | — | Yes |
| Premium support | — | — | Yes |
| Booking management | Yes | Yes | Yes |
| Customer messaging | Yes | Yes | Yes |
| Annual billing discount | — | ~$16/mo | ~$40/mo |

### 10.2 Customer Tiers

Customers subscribe for enhanced booking and organization features.

| Feature | Free | Pro ($9.99/mo) | Business ($24.99/mo) |
|---|---|---|---|
| Saved providers | 10 | 50 | Unlimited |
| Provider folders | — | Yes | Yes |
| Priority booking | — | Yes | Yes |
| Bulk quote requests | — | — | Yes |
| Booking analytics & reports | — | — | Yes |
| CSV/PDF export | — | — | Yes |
| Dedicated support | — | — | Yes |
| Annual billing discount | — | ~$7.99/mo | ~$19.99/mo |

### 10.3 Referral Tier Rewards

The referral program uses a 4-tier reward structure based on completed referrals:

| Tier | Referrals Required | Reward Percentage | Color |
|---|---|---|---|
| Bronze | 0–5 | 10% | Bronze |
| Silver | 6–10 | 15% | Silver |
| Gold | 11–25 | 20% | Gold |
| Platinum | 26+ | 25% | Platinum |

Referral credits expire after **90 days**. A background job checks daily for expired credits. Users receive a warning banner when credits are expiring within 14 days.

---

## 11. Integrations

### 11.1 Stripe Payments

The platform uses Stripe for all payment processing:

- **Stripe Checkout** — Secure hosted payment page for booking payments (deposit or full)
- **Stripe Connect** — Provider payouts via destination charges with 1% platform fee
- **Stripe Webhooks** — Handles checkout completion, payment success/failure, refunds, and subscription lifecycle events
- **Customer Subscriptions** — Pro/Business tiers managed via Stripe Billing
- **Provider Subscriptions** — Basic/Premium tiers managed via Stripe Billing
- **Referral Credits** — Applied as discounts before Stripe session creation; full-credit bookings skip Stripe entirely
- **Cancellation Refunds** — Time-based automation: 48h+ = 100%, 24h+ = 75%, 4h+ = 50%, <4h = 0%

### 11.2 Twilio SMS

SMS notifications are sent via Twilio for critical events:

- Booking confirmations, status changes, cancellations
- 24-hour booking reminders
- Quote request/response notifications
- Session reschedule notifications
- **Incoming SMS Webhook** at `/api/twilio/sms` handles opt-out keywords (STOP, UNSUBSCRIBE, CANCEL, END, QUIT) and opt-in keywords (START, SUBSCRIBE, YES, UNSTOP) per TCPA compliance

### 11.3 Server-Sent Events (SSE)

Real-time notifications via `/api/sse/notifications`:

- JWT cookie authentication
- Multi-tab support (one connection per user, broadcasts to all tabs)
- Heartbeat every 30 seconds
- Triggered on: booking creation, status changes, new messages, payment events, quote updates
- Client-side `useSSE` hook with exponential backoff reconnection
- Toast notifications via Sonner for real-time events

### 11.4 Progressive Web App (PWA)

Full PWA implementation:

- **Service Worker** — Offline caching, background sync, push event handling
- **Web App Manifest** — App name, icons, theme colors, splash screens
- **Install Prompt** — Custom banner for "Add to Home Screen"
- **Offline Bookings** — Cached upcoming bookings viewable offline with "last synced" timestamp
- **Background Sync** — Queued offline actions (up to 3 retries) replayed when online
- **Push Notifications** — VAPID-based web push for booking alerts, messages, payments, quotes, reminders
- **Badge Count** — `navigator.setAppBadge()` syncs unread notification count
- **Notification Grouping** — Groups push notifications by type after threshold (2+), shows summary

### 11.5 iCal Calendar Integration

Provider bookings sync with external calendars:

- **iCal Feed** — `/api/calendar/:providerId/feed.ics` with `REFRESH-INTERVAL: PT15M`
- **Individual .ics** — `/api/calendar/booking/:id.ics` for single booking download
- **webcal://** — One-click subscription button for instant calendar sync
- **"Add to Calendar"** — Button on BookingDetail page supporting Google Calendar, Apple Calendar, Outlook

### 11.6 S3 File Storage

All file uploads go through S3 via Manus Forge helpers:

- Provider profile photos
- Service photos (tier-gated limits)
- Portfolio work samples (including before/after pairs)
- Verification documents
- OG images (cached with 24h TTL)

### 11.7 OG Meta Tags for Social Sharing

Social media link previews are handled via a dedicated Express route that bypasses Manus CDN pre-rendering:

- **`/api/og/provider/:slug`** — Provider profile OG tags with business name, description, location, rating, profile photo
- **`/api/og/service/:id`** — Service OG tags with name, price, duration, provider, category
- **`/api/og/category/:slug`** — Category OG tags with name and description
- **Homepage** — Static OG tags with branded 1200x630 image
- **Referral Program** — OG tags with branded image injected server-side
- Human visitors are instantly redirected via `<meta http-equiv="refresh">` + JavaScript redirect
- `og:url` canonical points to the SPA page, not the `/api/og/` route

### 11.8 Email Notifications

Email delivery via Manus Forge API:

- Booking confirmations, status changes, cancellations
- 24-hour booking reminders
- Review reminders (24h after completion)
- Quote request/response/accept/decline notifications
- Session status changes (completed, cancelled, rescheduled)
- Referral notifications (signup, completed, welcome)
- Contact form confirmation with reference number
- Admin replies to contact submissions
- All emails include unsubscribe links

---

## 12. Feature Inventory

The platform was built across **30+ development phases**. Below is a comprehensive inventory of all implemented features.

### 12.1 Foundation & Core

- Database schema with 28 tables, seed data, and domain-specific query helpers
- Manus OAuth authentication with JWT session cookies and role-based access (customer/provider/admin)
- Post-signup role selection screen with `hasSelectedRole` flag
- Provider registration with 4-step onboarding wizard (photo → categories → services → Stripe)
- Provider onboarding landing page with benefits, stats, how-it-works, testimonials, FAQ
- Provider onboarding checklist widget (7 items) with progress bar and celebration state
- Service catalog with 42 categories, full-text search, and multi-filter pagination
- Flexible pricing models: fixed, hourly, package, custom quote
- Smart duration display with `formatDuration()` utility and DURATION_PRESETS dropdown
- Day Rate label for 8+ hour services
- Service photo uploads to S3 with tier-gated limits

### 12.2 Booking & Scheduling

- Real-time availability system with weekly schedules and date-specific overrides
- Interactive booking calendar with time slot selection
- Step-by-step booking flow: date → time → details → confirm → pay
- Single, multi-day, and recurring booking types
- Multi-day bookings with end date picker and per-day rate calculation (auto-detected for AV Crew, TV/Film, Event Planning, Day Labor, Home Renovation categories)
- Recurring bookings with day-of-week toggles, weekly/biweekly frequency, 1-52 week range (auto-detected for Fitness, Personal Trainer, Dance, Cleaning, Massage, Pet Care categories)
- Individual session management: complete, cancel, reschedule with conflict detection
- Double-booking prevention with server-side time-slot conflict checks
- Schedule conflict detector with warning UI and override option
- Provider availability exceptions (block dates) with quick-block presets
- Booking status management: pending → confirmed → in_progress → completed / cancelled / no_show / refunded
- Customer bookings dashboard with "Made" vs "Received" toggle for providers
- CSV and PDF export for booking history (Business tier)

### 12.3 Payments & Subscriptions

- Stripe Checkout integration for deposit and full payment
- Stripe Connect for provider payouts with destination charges and 1% platform fee
- Cancellation refund automation (time-based: 48h=100%, 24h=75%, 4h=50%, <4h=0%)
- Stripe webhook handler for checkout, payment success/failure, refunds, subscriptions
- Payment failure notifications via email and in-app
- Provider subscription tiers (Free/Basic/Premium) with feature gating
- Customer subscription tiers (Free/Pro/Business) with saved provider limits and perks
- Referral credits applied at checkout with real-time discount preview
- Full credit payment (skip Stripe when credits cover entire amount)

### 12.4 Promo Codes & Referrals

- Provider promo code CRUD with percentage and fixed discounts
- Usage limits, expiration dates, service-specific codes, min order / max discount caps
- Promo code input in booking flow with real-time validation and discount preview
- Customer referral program with unique codes (REF-XXXXXX)
- Provider referral program (shared infrastructure with customer referrals)
- 4-tier referral rewards: Bronze (10%), Silver (15%), Gold (20%), Platinum (25%)
- Referral credit system: earned on booking completion, spendable at checkout, expires after 90 days
- Credit balance badge in navigation header
- Public referral program landing page with OG meta tags
- Post-booking "Share & Earn" card on confirmation page
- Referral email notifications (signup, completed, welcome)
- Admin referral analytics dashboard

### 12.5 Communication

- Booking-threaded messaging system
- Unified notification service (email via Forge API, SMS via Twilio, push via VAPID)
- Notification center UI with bell icon, dropdown, and full page
- Email unsubscribe with one-click token-based opt-out
- Notification preferences per channel (email/SMS/push) and per type (booking/reminder/message/payment/marketing)
- 24-hour booking reminder service (email + SMS + push)
- Review reminder service (24h after completion)
- Real-time SSE notifications with toast alerts
- SMS opt-out/opt-in webhook (STOP/START/HELP keywords)

### 12.6 Provider Tools

- Provider dashboard with 6 tabs: Bookings, Services, Schedule, Finances, My Page, More
- Mobile bottom navigation bar for dashboard
- Provider analytics (booking trends, revenue, retention, top services, booking sources)
- Public provider profiles at `/p/:slug` with custom slugs (Basic/Premium)
- Provider portfolio/gallery with before/after photo comparison slider
- Service package builder with bundled pricing and savings badge
- Embeddable booking widgets (iframe, popup, direct link) with code generator
- iCal calendar feed with webcal:// subscription and "Add to Calendar" button
- Provider calendar view (month/week) with color-coded status events
- Stripe Connect onboarding, balance display, and dashboard link
- Verification document upload (identity, business_license, insurance, background_check)
- Provider response time tracking with badge display
- Share Profile button with social media sharing and QR code
- OlogyCrew Official provider account with "Official" badge

### 12.7 Customer Tools

- Browse categories with provider counts
- Full-text search with 300ms debounce, provider + service results
- Filters: price range, rating, location, service type (in-person, mobile, virtual, hybrid)
- Saved/favorited providers with heart icon toggle
- Saved provider folders (Pro/Business tier)
- Bulk quote requests to multiple providers (Business tier)
- Booking analytics with spending charts and category breakdown (Business tier)
- Request a Quote flow with provider response and accept/decline
- Quote-to-booking conversion (auto-creates booking on acceptance)
- Profile completion indicator with progress bar

### 12.8 Admin Panel

- User management with search and role display
- Provider approval/rejection workflow
- Transaction monitoring
- Platform analytics (bookings, revenue, user growth)
- Subscription analytics (MRR, tier distribution, churn, conversion rates)
- Review moderation panel (flag/hide/delete)
- Verification document review panel (approve/reject)
- Contact submissions panel with status tracking, admin replies, canned templates
- Push notification analytics (subscriptions, adoption rate, growth)
- Referral analytics (conversion rate, top referrers, monthly trend, credit summary)

### 12.9 PWA & Offline

- Web app manifest with icons and splash screens
- Service worker for offline caching
- PWA install prompt banner
- Offline bookings viewer with cached data and "last synced" timestamp
- Web Push notifications with VAPID keys
- Push notification grouping by type
- PWA badge count sync
- Background sync for offline actions with retry queue
- Pending actions indicator in navbar

### 12.10 UX & Navigation

- Provider/Customer view mode switcher with auto-switch on route navigation
- Consistent NavHeader on all pages with logo, links, user menu, credit badge
- Contextual PageHeader with breadcrumbs and back button on all pages
- Mobile-responsive design across all 38 pages
- Mobile bottom navigation for provider dashboard
- Clear (X) buttons on search fields
- "Become a Provider" card on customer profile page
- Conditional CTA: "Go to Dashboard" for existing providers on homepage

### 12.11 Legal & Compliance

- Privacy Policy page with SMS data practices
- Terms of Service page with SMS program details (STOP/START/HELP)
- Twilio SMS opt-out/opt-in webhook for TCPA compliance
- Email unsubscribe with one-click token

### 12.12 Social & Marketing

- OG meta tags for provider profiles, services, categories, homepage, referral program
- Dynamic OG image generation (1200x630) for providers and services via satori + resvg
- Share Profile component with copy link, Facebook, X, WhatsApp, LinkedIn, Email, QR code
- Branded homepage OG image with category chips
- Referral program OG image with tier badges

---

## 13. Bug Fixes & Known Issues

### 13.1 Resolved Bug Fixes

The following significant bugs have been identified and resolved during development:

- **Provider Dashboard Not Showing** — `provider.create` was not updating user role from "customer" to "provider"; fixed with role update + data migration for 142 existing users
- **Featured Providers "Provider Not Found"** — Homepage used `provider.slug` but data had `profileSlug`; fixed link + auto-generate slug for providers missing one
- **Search Input Loses Focus** — FilterContent was a nested component re-created on every render; refactored to plain function returning JSX
- **Day Rate Duration Error** — Empty strings sent for decimal columns (hourlyRate); fixed with empty-string-to-null conversion in service.create/update
- **Social Media Link Preview** — Manus CDN pre-renders SPA pages replacing OG tags; solved with `/api/og/` route bypass
- **Homepage 404** — "Go to Dashboard" linked to `/dashboard` instead of `/provider/dashboard`
- **Browse Price Filter** — Excluded custom_quote services with null basePrice; fixed to include them
- **Provider Category Names Null** — `getProviderCategories` was not JOINing with `serviceCategories`; fixed with proper JOIN
- **Mobile Dashboard Overflow** — Booking cards and buttons running off screen; fixed with flex-wrap and overflow-hidden
- **Hooks Error on Provider Profile** — "Rendered more hooks than during the previous render"; fixed by ensuring all hooks called unconditionally
- **Mobile Profile Layout** — Overlapping text and buttons; fixed with responsive stacking and truncation
- **Slug Editor Mobile** — Input too small on iPhone; fixed with full-width, 16px font (prevents iOS zoom), stacked layout
- **Book Button Offset** — Service card book button clipped on mobile; fixed with flex-col stacking
- **Navbar Logo Overlapping** — Logo + text overlapping with nav links; fixed with proper spacing

### 13.2 Known Issues / Future Enhancements

| Issue | Status | Notes |
|---|---|---|
| Browse Services "No categories found" when not signed in | Open | May be related to production deployment |
| Search auto-triggers on page load without user input | Open | Production-specific behavior |
| Additional OAuth providers (Google, Apple) | Planned | Currently Manus OAuth only |
| Profile photo upload for customers | Planned | Currently provider-only |
| System health monitoring in admin dashboard | Planned | — |
| Frontend component tests | Planned | Currently server-only Vitest tests |
| Payment receipt PDF generation | Planned | — |
| Real-time WebSocket messaging | Planned | Currently 5s polling + SSE for notifications |
| Holistic Wellness Center category | Planned | New category requested |

---

## 14. Marketing Assets

The following marketing assets have been generated and are stored in `/home/ubuntu/webdev-static-assets/`:

| Asset | File | Purpose |
|---|---|---|
| Instagram Post Graphic | `ologycrew-ig-post-1.png` | Beta launch provider recruitment post |
| AV-Tech Facebook Post | `ologycrew-av-fb-post.png` | AV-tech themed Facebook group post graphic |

Additional marketing content has been created (text-based, not stored as files):

- **Alignable outreach messages** — Wellness provider and barber-focused templates
- **Facebook bio/About Us/How We Got Started** — Platform story copy
- **Instagram caption** — Beta launch post caption with hashtags
- **AV-tech Facebook group post** — Copy for audio/visual tech community outreach

---

## Appendix A: Service Categories (42)

| ID | Category Name | Services |
|---|---|---|
| 7 | BARBER SHOP | 14 |
| 8 | SALON MOBILE | 14 |
| 9 | HANDYMAN | 10 |
| 10 | MASSAGE THERAPIST | 12 |
| 11 | PET CARE and GROOMING | 16 |
| 12 | PERSONAL TRAINER | 10 |
| 15 | AUDIO VISUAL CREW | 22 |
| 17 | PHOTOGRAPHY SERVICES | 12 |
| 19 | TV/FILM CREW | 19 |
| 20 | DJ & MUSIC SERVICES | 7 |
| 22 | DRIVER and FREIGHT SERVICES | 4 |
| 23 | DENTAL CARE | 7 |
| 26 | RESERVATION BOOKING | 2 |
| 73 | PERSONAL FOOD DELIVERY | 1 |
| 109 | FITNESS CLASSES & TRAINERS | 13 |
| 111 | LOCKS & TWIST HAIRSTYLES | 6 |
| 126 | CYBERSECURITY SERVICES | 28 |
| 148 | POWER WASHING & EXTERIOR CLEANING | 10 |
| 155 | VIRTUAL ASSISTANT | 12 |
| 158 | PERSONAL and PROFESSIONAL COACHING | 7 |
| 168 | MOBILE AUTO DETAILING | 11 |
| 169 | MOBILE AUTO MAINTENANCE | 13 |
| 170 | BARBER MOBILE | 14 |
| 171 | IN-SALON SERVICES | 14 |
| 174 | IN-SHOP AUTO DETAILING | 11 |
| 176 | IN-SHOP AUTO MAINTENANCE | 13 |
| 177 | EVENT PLANNING & MANAGEMENT | 10 |
| 178 | FINANCIAL ADVISOR | 7 |
| 179 | HOME RENOVATION and REMODELING | 15 |
| 188 | HOME CLEANING | 6 |
| 193 | HEALTH and WELLNESS SERVICES | 5 |
| 194 | TANNING SALON | 4 |
| 195 | DANCE LESSONS & INSTRUCTORS | 5 |
| 196 | EYE CARE & VISION SERVICES | 9 |
| 197 | FREE ESTIMATES | 10 |
| 198 | TECH SUPPORT & IT SERVICES | 8 |
| 199 | PARTY & EVENT RENTALS | 5 |
| 200 | HOME ENERGY SOLUTIONS | 5 |
| 201 | VIRTUAL EVENTS MANAGEMENT | 5 |
| 202 | DAY LABOR | 7 |
| 205 | WEBSITE PRODUCTION | 4 |

---

## Appendix B: Test Coverage

The test suite contains **530+ tests** across **51 test files**, all using Vitest. Tests cover:

- Authentication and role management
- Provider CRUD and profile operations
- Service creation, search, and filtering
- Booking creation (single, multi-day, recurring)
- Session management (complete, cancel, reschedule)
- Payment and subscription flows
- Quote request lifecycle
- Promo code validation and redemption
- Referral system (codes, credits, tiers, fulfillment, expiration)
- Notification system (SSE, push, email, SMS)
- Admin operations (analytics, moderation, verification)
- Contact form and admin reply system
- OG tag generation and page routes
- Duration formatting utilities
- Time slot generation
- PWA features (offline bookings, background sync, push grouping)
- Help center content structure
- Search improvements and debounce

---

*Document generated April 2026. For the latest feature tracking, see `todo.md` in the project root.*

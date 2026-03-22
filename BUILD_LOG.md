# SkillLink Platform — Build Log

This document provides a complete, chronological record of every phase of the SkillLink Service Scheduling Platform build. It is intended as a reference for debugging, onboarding, and future development decisions.

---

## Project Overview

| Field | Value |
|---|---|
| **Project Name** | SkillLink (service-scheduling-platform) |
| **Stack** | React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL (TiDB) |
| **Auth** | Manus OAuth (session cookie) |
| **Payments** | Stripe Connect (destination charges) — providers receive payments directly, platform takes 1% fee |
| **Notifications** | Email via Manus Forge API, SMS stub ready |
| **Hosting** | Manus built-in hosting with custom domain support |
| **Total Source Files** | 131 (excluding node_modules and test files) |
| **Total Lines of Code** | ~20,386 |
| **Test Files** | 10 files, 154 tests (all passing) |
| **Database Tables** | 15 (including providerSubscriptions) |
| **Frontend Pages** | 21 (added ProviderOnboarding, SubscriptionAnalytics panel) |
| **tRPC Routers** | 14 (auth, provider, category, service, booking, review, message, notification, availability, stripe, stripeConnect, subscription, admin, system) |
| **Background Services** | 1 (Reminder Service — runs every 15 minutes) |

---

## Phase 1: Foundation and Database Schema

**Objective:** Design and implement the complete database schema to support a multi-sided marketplace connecting customers with service providers across 42 categories.

**What was built:**

The database schema was designed with 14 tables in `drizzle/schema.ts` and pushed via `pnpm db:push`. The tables are:

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Core user accounts with role-based access | `role` enum: customer, provider, admin |
| `service_providers` | Provider business profiles | businessName, businessType, verificationStatus, stripeAccountId, commissionRate |
| `service_categories` | 42 predefined service categories | name, slug, isMobileEnabled, isFixedLocationEnabled, isVirtualEnabled |
| `services` | Individual services offered by providers | pricingModel (fixed/hourly/package/custom_quote), depositRequired, durationMinutes |
| `service_photos` | Photo gallery for services | photoUrl, caption, sortOrder, isPrimary |
| `availability_schedules` | Recurring weekly availability | dayOfWeek (0-6), startTime, endTime, maxConcurrentBookings |
| `availability_overrides` | Date-specific schedule changes | overrideDate, isAvailable, reason |
| `bookings` | Customer-provider booking records | bookingNumber, status (7 states), pricing breakdown, location details |
| `payments` | Stripe payment tracking | stripePaymentIntentId, paymentType (deposit/final/full/refund) |
| `reviews` | Customer reviews with provider responses | rating (1-5), reviewText, responseText, respondedAt |
| `messages` | Booking-linked messaging | conversationId, senderId, recipientId, isRead |
| `notifications` | Multi-channel notification records | notificationType, isSentEmail, isSentSms |
| `verification_documents` | Provider identity/license verification | documentType, verificationStatus, expirationDate |

All 42 service categories were seeded into the database with IDs matching the project specification (e.g., BARBER SHOP = ID 7, HANDYMAN = ID 9, MASSAGE THERAPIST = ID 10, etc.).

**Database indexes** were added on all foreign keys and frequently queried columns (provider ratings, booking status+date, category active+sort order, etc.) for production-ready performance.

**Key decisions:**
- Used `varchar` for bookingDate and overrideDate (YYYY-MM-DD format) instead of MySQL `date` type for simpler string comparisons in availability queries.
- Used `decimal(10,2)` for all monetary fields to avoid floating-point precision issues.
- Booking status uses a 7-state enum: pending → confirmed → in_progress → completed, with cancelled/no_show/refunded as terminal states.

---

## Phase 2: Authentication and User Management

**Objective:** Implement role-based authentication with three user types.

**What was built:**

The Manus OAuth flow was configured (pre-built in the template). The `users` table was extended with a `role` enum supporting three roles:

- **Customer** (default): Can browse services, book appointments, leave reviews, send messages.
- **Provider**: Can create a business profile, list services, manage availability, accept/decline bookings.
- **Admin**: Full platform oversight — user management, provider verification, booking monitoring.

The `authRouter` exposes:
- `auth.me` — returns current user or null
- `auth.logout` — clears session cookie
- `auth.updateProfile` — updates user profile fields

The `useAuth()` hook on the frontend provides `user`, `loading`, and `isAuthenticated` state. The `useProtectedPage()` hook redirects unauthenticated users to the login page.

**Key decisions:**
- Role is set at user creation time. Provider role is assigned when a user creates a provider profile (the `provider.create` procedure does not change the user's role — it creates a linked `service_providers` record). Admin role is auto-assigned to the platform owner via `ENV.ownerOpenId`.

---

## Phase 3: Provider Onboarding and Profiles

**Objective:** Allow users to register as service providers with business information.

**What was built:**

The `providerRouter` handles provider lifecycle:
- `provider.create` — creates a provider profile (validates no duplicate exists)
- `provider.getMyProfile` / `provider.getMine` — retrieves the current user's provider profile
- `provider.getById` — public lookup by provider ID
- `provider.list` — public listing with optional city/state/isActive filters
- `provider.listFeatured` — returns active providers sorted by rating

The **Provider Dashboard** (`/provider/dashboard`) was built with:
- Overview cards showing total services, active bookings, and average rating
- "My Services" tab listing all services with edit/delete actions
- "My Bookings" tab with status filters and booking management
- Quick action buttons for creating services and managing availability

The **Create Service** page (`/provider/services/new`) supports:
- Category selection from all 42 categories
- Four pricing models: fixed price, hourly rate, package, custom quote
- Deposit configuration (fixed amount or percentage)
- Service type selection (mobile, fixed location, virtual, hybrid)
- Duration, preparation time, cleanup time, and buffer time settings

**Key decisions:**
- Provider profiles are linked 1:1 with user accounts via `userId` unique constraint.
- Verification status starts as "pending" and must be approved by an admin.

---

## Phase 4: Service Catalog and Browsing

**Objective:** Build the public-facing service discovery experience.

**What was built:**

The `categoryRouter` provides:
- `category.list` — all active categories
- `category.getById` / `category.getBySlug` — single category lookup

The `serviceRouter` provides:
- `service.create` — provider-only service creation
- `service.getById` — public service detail
- `service.listByProvider` / `service.listByCategory` — filtered listings
- `service.search` — keyword search across service names and descriptions
- `service.listMine` — provider's own services

Frontend pages:
- **Home** (`/`) — hero section with search bar, popular category chips, featured providers
- **Browse** (`/browse`) — grid of all 42 service categories with service counts
- **Category Detail** (`/category/:slug`) — services within a specific category
- **Search** (`/search`) — keyword search with results display
- **Service Detail** (`/service/:id`) — full service information with booking calendar

**Key decisions:**
- Search is implemented as a server-side LIKE query on service name and description. For MVP this is sufficient; a full-text search index could be added later.
- Categories use URL-friendly slugs (e.g., "massage-therapist", "barber-shop") generated from the category name.

---

## Phase 5: Availability Scheduling System

**Objective:** Allow providers to define when they are available for bookings.

**What was built:**

The `availabilityRouter` provides:
- `availability.createSchedule` — set recurring weekly availability (day of week + time range)
- `availability.getSchedule` / `availability.getMySchedule` — retrieve provider schedules
- `availability.createOverride` — date-specific overrides (e.g., holidays, special hours)
- `availability.getOverrides` / `availability.getMyOverrides` — retrieve overrides

The **Manage Availability** page (`/provider/availability`) provides:
- A weekly schedule editor with day-by-day time range configuration
- An override calendar for blocking specific dates or adding special hours
- Visual display of the current schedule

The shared `timeSlots.ts` utility generates available time slots by:
1. Checking the provider's weekly schedule for the requested day of week
2. Applying any date-specific overrides
3. Filtering out slots that conflict with existing bookings
4. Returning an array of `{ time, available, bookingId? }` objects

**Key decisions:**
- Time slots are generated in 30-minute intervals by default.
- The system supports `maxConcurrentBookings` per time slot (default: 1) for providers who can serve multiple customers simultaneously.

---

## Phase 6: Booking System

**Objective:** Implement the complete booking lifecycle from request to completion.

**What was built:**

The `bookingRouter` provides:
- `booking.create` — creates a booking with automatic pricing calculation
- `booking.getById` — retrieves booking with access control (customer, provider, or admin)
- `booking.myBookings` / `booking.listMine` — customer's bookings with optional status filter
- `booking.providerBookings` / `booking.listForProvider` — provider's bookings
- `booking.listByDateRange` — bookings within a date range (for availability checking)
- `booking.updateStatus` — status transitions with cancellation tracking

The **Service Detail** page (`/service/:id`) includes a 4-step booking flow:
1. **Select Date** — calendar with visual availability indicators (green = available, gray = unavailable)
2. **Select Time** — time slot grid generated from provider availability
3. **Enter Details** — location information and customer notes
4. **Review and Confirm** — pricing summary with subtotal, platform fee, deposit, and total

The **Booking Confirmation** page (`/booking/:id`) shows:
- Booking number, status badge, and all booking details
- Payment button (Stripe checkout) for pending bookings
- Messaging link to contact the provider
- Review link for completed bookings

The **My Bookings** page (`/my-bookings`) shows:
- All customer bookings with status filters
- Booking cards with service name, provider, date, time, and amount
- Quick actions (view details, cancel, leave review)

**Pricing calculation:**
- Subtotal is based on the service's base price or hourly rate × duration
- Platform fee is 15% of the subtotal
- Total = subtotal + platform fee
- Deposit amount is calculated based on the service's deposit settings (fixed or percentage)
- Remaining amount = total - deposit

**Key decisions:**
- Booking numbers use the format `SKL-{timestamp}-{random}` for uniqueness.
- Status transitions are enforced at the API level with access control checks.
- Both customers and providers can cancel bookings, with the `cancelledBy` field tracking who initiated.

---

## Phase 7: Stripe Payment Integration

**Objective:** Enable secure payment processing for booking deposits and full payments.

**What was built:**

The `stripeRouter` provides:
- `stripe.createCheckoutSession` — creates a Stripe Checkout session for a booking

The `stripeWebhook.ts` handles:
- `checkout.session.completed` — updates booking with payment confirmation, sends email notification
- `payment_intent.succeeded` — logs successful payment
- `payment_intent.payment_failed` — logs failed payment (TODO: customer notification)
- `charge.refunded` — logs refund (TODO: booking status update)
- Test event detection (`evt_test_*`) for webhook verification

The `products.ts` file provides:
- `calculatePlatformFee(subtotal)` — 15% platform fee
- `calculateDepositAmount(total, type, amount, percentage)` — deposit calculation
- `calculateBookingTotal(servicePrice)` — full pricing breakdown

**Webhook registration:** The webhook endpoint is registered at `/api/stripe/webhook` with `express.raw()` middleware before `express.json()` to preserve the raw body for Stripe signature verification.

**Key decisions:**
- Stripe is in test mode. Users can test with card `4242 4242 4242 4242`.
- Checkout sessions open in a new browser tab.
- Payment metadata includes bookingId, customerId, providerId, serviceId, and bookingNumber for reconciliation.
- Promotion codes are enabled via `allow_promotion_codes: true`.

---

## Phase 8: Messaging System

**Objective:** Enable direct communication between customers and providers linked to bookings.

**What was built:**

The `messageRouter` provides:
- `message.send` — sends a message with automatic conversation ID generation
- `message.getConversation` — retrieves all messages in a conversation
- `message.myConversations` — lists all conversations for the current user
- `message.listByBooking` — messages linked to a specific booking
- `message.markAsRead` — marks messages as read
- `message.unreadCount` — returns unread message count for the current user

The **Messages** page (`/messages/:bookingId`) provides:
- Real-time message display with 5-second polling
- Message input with send button
- Booking context header showing service and provider info
- Read receipts (messages marked as read when conversation is opened)

The **NavHeader** component displays an unread message badge across all pages.

**Key decisions:**
- Conversation IDs are deterministic: `conv-{lowerUserId}-{higherUserId}` ensures both parties share the same conversation.
- Messages are linked to bookings via `bookingId` for context.
- Polling interval is 5 seconds (a reasonable balance between responsiveness and server load for MVP).

---

## Phase 9: Review and Rating System

**Objective:** Allow customers to rate and review completed services, and providers to respond.

**What was built:**

The `reviewRouter` provides:
- `review.create` — submit a review (only for completed bookings, one per booking)
- `review.listByProvider` — paginated reviews for a provider
- `review.addResponse` — provider response to a review

The **Submit Review** page (`/booking/:id/review`) provides:
- Star rating selector (1-5)
- Text review input
- Booking context display

The **Provider Reviews** page (`/provider/reviews`) provides:
- List of all reviews for the provider
- Response form for each review
- Average rating display

Reusable components:
- `ReviewCard` — displays a single review with rating, text, and provider response
- `ReviewList` — paginated list of reviews with loading states

The `updateProviderRating()` helper recalculates and updates the provider's `averageRating` and `totalReviews` fields whenever a new review is submitted.

**Key decisions:**
- Reviews are limited to one per booking (enforced by unique constraint on `bookingId`).
- Only customers who completed a booking can leave a review.
- Provider responses are stored in the same `reviews` table (`responseText` field).

---

## Phase 10: Notification System

**Objective:** Build a multi-channel notification architecture supporting email and SMS.

**What was built:**

The notification system uses a plugin architecture:
- `NotificationService` — singleton service that routes notifications to registered providers
- `EmailProvider` — sends emails via Manus Forge API with HTML-formatted templates
- `SMSProvider` — stub implementation ready for Twilio integration
- `templates.ts` — 10 notification templates covering the full booking lifecycle

Templates implemented:
1. `new_booking_request` — sent to provider when a new booking is created
2. `booking_confirmed` — sent to customer when provider confirms
3. `booking_cancelled` — sent to customer with optional refund info
4. `booking_completed` — sent to customer with review link
5. `payment_received` — sent to customer confirming payment
6. `payment_failed` — sent to customer requesting payment update
7. `message_received` — sent when a new message arrives
8. `review_received` — sent to provider when a review is posted
9. `reminder_24h` — 24-hour appointment reminder
10. `reminder_1h` — 1-hour appointment reminder

The `notificationRouter` provides:
- `notification.list` — user's notifications with optional unread filter
- `notification.markAsRead` — marks a notification as read

**Key decisions:**
- Email HTML templates include SkillLink branding with gradient header.
- SMS bodies are kept under 160 characters for single-message delivery.
- The architecture supports adding push notifications or other channels without modifying existing code.

---

## Phase 11: Admin Dashboard

**Objective:** Provide platform administrators with oversight and management tools.

**What was built:**

The `adminRouter` provides:
- `admin.getStats` — real platform-wide statistics (total users, providers, bookings, revenue with month-over-month)
- `admin.listUsers` — paginated user list with suspension status
- `admin.listProviders` — paginated provider list with verification status
- `admin.listBookings` — paginated booking list
- `admin.suspendUser` — suspend a user account (sets deletedAt timestamp)
- `admin.unsuspendUser` — restore a suspended user account
- `admin.verifyProvider` / `admin.rejectProvider` — provider verification workflow
- `admin.updateProviderVerification` — flexible verification status update

The **Admin Dashboard** page (`/admin`) provides:
- Overview tab with stats cards (users, providers, bookings, revenue)
- Users tab with user list and suspend action
- Providers tab with verification approve/reject actions
- Bookings tab with booking list and status overview

**Key decisions:**
- Admin access is enforced at the procedure level via `adminProcedure` middleware.
- The admin role is auto-assigned to the platform owner.

---

## Phase 12: Dev and Testing Environment

**Objective:** Create a robust development and testing environment for the platform.

**What was built:**

**Test suite** (88 tests across 6 files):
- `auth.logout.test.ts` — authentication logout flow
- `platform.test.ts` — categories, providers, services, availability, bookings, auth, DB helpers (15 tests)
- `skilllink.test.ts` — comprehensive end-to-end tests for all routers (27 tests)
- `review.test.ts` — review creation, provider response, listing (3 tests)
- `next-steps.test.ts` — unread message count, booking calendar features (16 tests)
- `timeSlots.test.ts` — time slot generation utility (26 tests)

**Seed data script** (`seed-data.mjs`):
- 11 test users (1 admin, 5 providers, 5 customers)
- 6 provider profiles across different categories
- 17 services with various pricing models
- 18 bookings in various states (pending, confirmed, completed, cancelled)
- 9 reviews with ratings and provider responses
- 3 message conversations
- Availability schedules for all providers

**DevTools Panel** — floating development tool (bottom-right corner):
- Current auth status display (role, name, email, user ID)
- Quick navigation links organized by role (Customer, Provider, Admin)
- Testing workflow guide
- Platform info (categories count, commission rate, payment mode)

**Key decisions:**
- Test users use timestamp-based unique IDs to avoid collisions between test runs.
- Seed data uses high ID ranges (270000+) to avoid conflicting with production data.

---

## Shared Utilities

| File | Purpose |
|---|---|
| `shared/timeSlots.ts` | Time slot generation with availability checking |
| `shared/types.ts` | Unified type exports from schema |
| `shared/const.ts` | Shared constants (cookie name, etc.) |
| `client/src/lib/dateUtils.ts` | Date/time formatting (formatDate, formatCurrency, formatRelativeTime) |
| `client/src/lib/trpc.ts` | tRPC client binding |
| `server/products.ts` | Pricing calculation helpers |
| `server/storage.ts` | S3 file storage helpers |

---

## Reusable Components

| Component | Location | Purpose |
|---|---|---|
| `NavHeader` | `components/shared/NavHeader.tsx` | Unified navigation bar with auth state, unread message badge, role-based links |
| `ReviewCard` | `components/shared/ReviewCard.tsx` | Single review display with rating stars and provider response |
| `ReviewList` | `components/shared/ReviewList.tsx` | Paginated review list with loading states |
| `StatusBadge` | `components/shared/StatusBadge.tsx` | Color-coded booking status badge |
| `EmptyState` | `components/shared/EmptyState.tsx` | Empty state placeholder with icon and message |
| `LoadingSpinner` | `components/shared/LoadingSpinner.tsx` | Full-page loading spinner |
| `DevToolsPanel` | `components/DevToolsPanel.tsx` | Development tools overlay |
| `DashboardLayout` | `components/DashboardLayout.tsx` | Sidebar layout for admin/dashboard pages |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary wrapper |

---

## Frontend Routes

| Route | Page | Access | Description |
|---|---|---|---|
| `/` | Home | Public | Landing page with search, categories, featured providers |
| `/browse` | Browse | Public | All 42 service categories grid |
| `/search` | Search | Public | Keyword search with results |
| `/category/:slug` | CategoryDetail | Public | Services within a category |
| `/service/:id` | ServiceDetail | Public | Service detail with booking calendar |
| `/booking/:id` | BookingConfirmation | Protected | Booking details, payment, messaging |
| `/booking/:id/review` | SubmitReview | Protected | Review submission form |
| `/my-bookings` | MyBookings | Protected | Customer's booking history |
| `/messages/:bookingId` | Messages | Protected | Booking-linked messaging |
| `/provider/dashboard` | ProviderDashboard | Protected | Provider management hub |
| `/provider/services/new` | CreateService | Protected | Service creation form |
| `/provider/availability` | ManageAvailability | Protected | Availability schedule editor |
| `/provider/reviews` | ProviderReviews | Protected | Provider's reviews and responses |
| `/admin` | AdminDashboard | Admin only | Platform administration |
| `/404` | NotFound | Public | 404 error page |

---

## Environment Variables

| Variable | Purpose | Source |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string | System |
| `JWT_SECRET` | Session cookie signing | System |
| `VITE_APP_ID` | Manus OAuth app ID | System |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | System |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | System |
| `OWNER_OPEN_ID` | Platform owner's user ID | System |
| `OWNER_NAME` | Platform owner's name | System |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL | System |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API key | System |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Forge API key | System |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Forge API URL | System |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) | Configured |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Configured |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Configured |

---

## Known Gaps and Future Work

The following items are identified but not yet implemented:

1. **Service photo upload** — schema exists but no upload UI or API
2. **Verification document upload** — schema exists but no upload UI or API
3. **Provider payouts** — Stripe Connect not configured; no payout logic
4. **Refund handling** — webhook handler logs but doesn't update booking status
5. **Payment failure notification** — webhook handler logs but doesn't notify customer
6. **SMS notifications** — provider is a stub awaiting Twilio credentials
7. **Embeddable booking widget** — not started
8. **Location-based search** — not implemented

### Resolved in Phase 13 (MVP Gap Fixes)

- ~~Admin stats are hardcoded~~ → Now uses real database queries
- ~~User suspension is a stub~~ → Now sets/clears `deletedAt` timestamp
- ~~Profile update is a stub~~ → Now persists to database
- ~~Service editing/deletion~~ → Full CRUD with UI
- ~~Provider profile editing~~ → Edit form in provider dashboard

---

## Phase 13: MVP Gap Fixes and Documentation

**Objective:** Close all remaining MVP gaps, create comprehensive documentation, and ensure all user roles have complete workflows.

**What was built:**

**Backend fixes:**
- `admin.getStats` now queries real data: total users, new users this month, total providers, pending verifications, total bookings, bookings this month, total revenue, revenue this month
- `admin.suspendUser` now sets `deletedAt` timestamp on the user record
- `admin.unsuspendUser` (new) clears `deletedAt` to restore access
- `admin.rejectProvider` (new) rejects a provider with a reason
- `auth.updateProfile` now persists firstName, lastName, phone, email to the database
- `provider.update` (new) allows providers to edit business name, description, phone, address fields
- `provider.earnings` (new) returns total earnings, completed bookings, pending earnings, and recent transactions
- `service.update` (new) allows providers to edit service name, description, price, duration, and status
- `service.delete` (new) allows providers to delete their services
- `availability.deleteSchedule` / `availability.deleteOverride` (new) allow providers to remove availability entries

**Frontend additions:**
- **UserProfile** page (`/profile`) — view and edit personal information
- **AdminDashboard** — real stats, working suspend/unsuspend, verify/reject providers
- **ProviderDashboard** — service edit/delete dialogs, profile editing, real earnings data, booking status management
- **NavHeader** — profile link with user icon

**Tests:** 14 new tests in `mvp-gaps.test.ts` covering admin stats, suspension, profile updates, provider updates, earnings, service CRUD, availability deletion, and provider verification.

---

## Phase 9: Provider-First Pivot (Stripe Connect and Public Profiles)

**Objective:** Pivot the platform from a middleman model to a provider-empowerment tool. Providers connect their own Stripe accounts and receive payments directly. The platform acts as their digital storefront and booking system.

**Business Model Change:**

The original model collected all payments centrally. The new model uses Stripe Connect with destination charges: when a customer books a service, the payment goes directly to the provider's connected Stripe account, and the platform automatically deducts a 15% application fee. This means providers own their revenue stream and the platform is a tool, not an employer.

**What was built:**

**Schema additions** — three new fields on the `serviceProviders` table: `profileSlug` (varchar, unique, nullable) for public profile URLs, `stripeAccountStatus` (enum: not_connected, onboarding, active, restricted) to track Connect account state, and `stripeOnboardingComplete` (boolean) to track whether the provider finished Stripe's identity verification.

**Stripe Connect backend** — a new `stripeConnectRouter` with five procedures: `startOnboarding` (creates a Stripe Express account and returns an Account Link URL), `getOnboardingLink` (resumes incomplete onboarding), `getStatus` (checks whether the account is connected, charges enabled, payouts enabled, details submitted), `getDashboardLink` (generates a login link to the Stripe Express Dashboard), and `getBalance` (retrieves available and pending balances from Stripe). The existing `stripeRouter.createCheckoutSession` was updated to use `payment_intent_data.transfer_data.destination` with `application_fee_amount` set to 15% of the total, so payments flow directly to the provider.

**Public provider profiles** — a new page at `/p/:slug` that works without authentication. It displays the provider's business name, description, verification badge, location, average rating, all active services with pricing, and customer reviews. This is the provider's "mini-website" that they can share on social media, business cards, or anywhere they want clients to find them. Three new public procedures were added: `provider.getBySlug`, `provider.getPublicServices`, and `provider.generateSlug` / `provider.updateSlug`.

**Provider Dashboard updates** — two new tabs: "Payments" (Stripe Connect onboarding wizard with step-by-step guide, balance display for connected accounts, and Stripe Dashboard access) and "My Page" (shareable profile link with copy-to-clipboard, slug customization with validation, and preview link).

**Database helpers added:** `getProviderBySlug`, `getPublicServicesByProvider`, `getPublicReviewsByProvider`, `updateProviderStripeAccount`, `updateProviderSlug`, `getProviderSlug`.

**Files created or modified:**

| File | Change |
|---|---|
| `drizzle/schema.ts` | Added profileSlug, stripeAccountStatus, stripeOnboardingComplete fields |
| `server/stripeConnectRouter.ts` | New router: startOnboarding, getOnboardingLink, getStatus, getDashboardLink, getBalance |
| `server/stripeRouter.ts` | Updated to use destination charges with application fee |
| `server/routers.ts` | Added stripeConnect router, generateSlug, updateSlug, getBySlug, getPublicServices |
| `server/db.ts` | Added 6 new helper functions for slugs and public profiles |
| `client/src/pages/PublicProviderProfile.tsx` | New page: public provider profile at /p/:slug |
| `client/src/pages/ProviderDashboard.tsx` | Added Payments tab (StripeConnectSection) and My Page tab (PublicProfileSection) |
| `client/src/App.tsx` | Added /p/:slug route |
| `server/stripe-connect.test.ts` | 12 new tests covering slug CRUD, public profile access, and Connect status |

**Tests:** 12 new tests in `stripe-connect.test.ts` covering slug generation, slug update, slug validation (invalid characters, too short), public profile access without auth, 404 for non-existent slugs, services included in public profiles, public services by provider ID, Connect status for unconnected providers, zero balance without Stripe account, customer access denied to provider endpoints, and dashboard link requiring Stripe account.

---

## Phase 10: Photo Uploads, Cancellation/Refund Automation, and Subscription Tiers

**Objective:** Implement three major features to complete the provider-first business model: service photo uploads via S3, automated cancellation with time-based refund tiers, and a subscription system (Free/Basic/Premium) that replaces the 15% transaction fee with a 1% fee plus monthly subscriptions.

**Revenue Model Change:** The platform fee was reduced from 15% to 1% per transaction. Revenue now comes primarily from provider subscriptions:

| Tier | Price | Max Services | Max Photos/Service | Custom Slug | Featured Listing | Priority Search |
|---|---|---|---|---|---|---|
| Starter (Free) | $0/mo | 3 | 2 | No | No | No |
| Professional (Basic) | $29/mo | 10 | 5 | Yes | No | Yes |
| Business (Premium) | $79/mo | Unlimited | 5 | Yes | Yes | Yes |

**What was built:**

**Service Photo Uploads:**
- `service.uploadPhoto` procedure accepts base64-encoded image data, uploads to S3 via `storagePut`, and stores metadata in `servicePhotos` table
- `service.getPhotos` and `service.deletePhoto` for management
- `PhotoUpload` reusable React component with drag-and-drop feel, preview thumbnails, and delete buttons
- Photo gallery on ServiceDetail page with lightbox-style image viewer
- Photo thumbnails on PublicProviderProfile service cards
- Tier-gated limits: Free tier gets 2 photos per service, Basic/Premium get 5

**Cancellation and Refund Automation:**
- Time-based refund policy engine in `booking.cancel` procedure:
  - 48+ hours before appointment: 100% refund
  - 24-48 hours: 75% refund
  - 4-24 hours: 50% refund
  - Less than 4 hours: 0% refund
  - Provider/admin cancellation: always 100% refund
- Automatic Stripe refund processing via `stripe.refunds.create` when payment exists
- Payment record updated with refund amount, reason, and Stripe refund ID
- Email notifications sent to both customer and provider on cancellation
- MyBookings page updated with cancellation dialog (reason input, refund estimate)
- Webhook handler updated for `charge.refunded` events

**Provider Subscription Tiers:**
- New `providerSubscriptions` database table tracking tier, status, Stripe subscription ID, and period dates
- `subscriptionRouter` with procedures: `mySubscription`, `createCheckout`, `createPortalSession`, `cancelSubscription`
- `products.ts` rewritten with tier definitions, limit helpers (`canProviderAddService`, `canProviderAddPhoto`), and 14-day trial configuration
- Feature gating enforced at the procedure level:
  - `service.create` checks service count against tier limit
  - `service.uploadPhoto` checks photo count against tier limit
  - `provider.updateSlug` requires Basic+ tier
  - `searchServices` boosts paid tier providers in results via LEFT JOIN on subscriptions
- `SubscriptionManagement` page with tier comparison cards, current plan display, and Stripe Checkout/Portal integration
- Subscription link added to ProviderDashboard Payments tab
- Webhook handler updated for subscription lifecycle events: `customer.subscription.created`, `updated`, `deleted`, `invoice.payment_failed`

**Files created/modified:**
- `drizzle/schema.ts` — added `providerSubscriptions` table
- `server/db.ts` — added 12 new helpers for photos, subscriptions, and cancellations
- `server/products.ts` — rewritten with tier definitions and 1% fee
- `server/subscriptionRouter.ts` — new subscription management router
- `server/routers.ts` — added photo upload/delete, cancellation, tier gating, search boost
- `server/stripeRouter.ts` — updated to 1% application fee
- `server/stripeWebhook.ts` — added subscription and refund event handlers
- `server/notifications/types.ts` — added subscription notification types
- `server/notifications/templates.ts` — added subscription notification templates
- `client/src/components/PhotoUpload.tsx` — reusable photo upload component
- `client/src/pages/SubscriptionManagement.tsx` — subscription tier selection page
- `client/src/pages/ServiceDetail.tsx` — added photo gallery
- `client/src/pages/PublicProviderProfile.tsx` — added photo thumbnails
- `client/src/pages/MyBookings.tsx` — added cancellation flow with refund display
- `client/src/pages/ProviderDashboard.tsx` — added photo management, subscription link, 1% fee display

**Tests:** 19 new tests in `phase10.test.ts` covering photo access and authorization, cancellation with refund calculation, cancellation authorization, subscription tier feature gating (service limits, slug limits), 1% fee calculation, tier limit helpers, search with priority boost, and 14-day trial configuration.

---

## Checkpoint History

| Version | Description |
|---|---|
| `385207ae` | Initial project scaffold |
| `6c32aea2` | Dev/testing environment: all 63 tests passing, DevTools panel |
| `c5a74fb0` | Next steps: seed data, unread message indicators, enhanced booking calendar (88 tests) |
| `7ebd86c8` | MVP gap fixes, documentation, UserProfile page (102 tests) |
| `0b0e50b0` | Provider-first pivot: Stripe Connect, public profiles, slug management (114 tests) |
| `8d5a7492` | Photo uploads, cancellation/refund automation, subscription tiers with 1% fee (133 tests) |
| (pending) | Subscription analytics, provider onboarding wizard, customer notifications & reminders (154 tests) |

---

## Phase 11: Subscription Analytics, Provider Onboarding Wizard, Customer Notifications

**Objective:** Complete three major features: (1) a subscription analytics panel for the admin dashboard, (2) a guided multi-step onboarding wizard for new providers, and (3) an automated customer notification and reminder system.

**What was built:**

### Subscription Analytics Panel (Admin Dashboard)

A new analytics section was added to the Admin Dashboard that gives platform administrators real-time visibility into subscription metrics. The `getSubscriptionAnalytics` database helper queries the `providerSubscriptions` table and computes:

| Metric | Description |
|---|---|
| **Monthly Recurring Revenue (MRR)** | Sum of active subscription prices ($29/mo for Basic, $79/mo for Premium) |
| **Active Subscribers by Tier** | Count of providers on each tier (Free, Basic, Premium) |
| **Conversion Rate** | Percentage of providers who upgraded from Free to a paid tier |
| **Churn Rate** | Percentage of subscriptions that were cancelled vs total ever created |
| **Total Revenue** | Cumulative subscription revenue |

The admin dashboard displays these metrics in a dedicated "Subscription Analytics" card section with clear numeric displays and contextual labels.

### Provider Onboarding Wizard

A new `ProviderOnboarding` page provides a guided, multi-step setup flow for new providers. The wizard walks providers through five sequential steps:

| Step | Title | What It Collects |
|---|---|---|
| 1 | Business Profile | Business name, type (sole proprietor/LLC/corporation/partnership), address, phone, description |
| 2 | First Service | Service category, name, pricing model, base price, duration, description |
| 3 | Availability | Weekly recurring schedule with day-of-week toggles and start/end times |
| 4 | Stripe Connect | Initiates Stripe Connect onboarding for payment acceptance |
| 5 | Subscription | Tier selection (Starter/Professional/Business) with feature comparison |

The wizard includes progress tracking, step validation, and the ability to skip optional steps (Stripe, subscription). New providers are redirected to the wizard after registration if their profile is incomplete.

### Customer Notification System

The notification system was enhanced with three key capabilities:

**Booking Confirmation Notifications:** When a booking is created, the system automatically sends email notifications to both the provider (alerting them of a new booking request) and the customer (confirming their booking submission). When a provider confirms a booking, an additional confirmation email is sent to the customer with appointment details.

**Status Change Notifications:** Email notifications are triggered for all booking status transitions: confirmed, completed, and cancelled. Each notification uses a specific template with relevant details (booking number, service name, date/time, provider name, refund information for cancellations).

**24-Hour Reminder System:** A background service (`reminderService.ts`) runs every 15 minutes and performs the following:

1. Queries the database for confirmed bookings occurring in the next 23-25 hours that have not yet received a reminder (`reminderSent = false`)
2. For each qualifying booking, sends email reminders to both the customer and the provider
3. Creates in-app notifications in the `notifications` table for both parties
4. Marks the booking's `reminderSent` flag as `true` to prevent duplicate reminders

The reminder service is started automatically when the server boots and can also be triggered manually by admins via the `admin.triggerReminders` tRPC procedure.

**Notification Architecture:**

The notification system uses a plugin-based architecture with the following components:

| Component | File | Purpose |
|---|---|---|
| `NotificationService` | `server/notifications/index.ts` | Central dispatcher that routes notifications to the appropriate provider |
| `EmailProvider` | `server/notifications/providers/email.ts` | Sends emails via Manus Forge API |
| `SMSProvider` | `server/notifications/providers/sms.ts` | Stub for Twilio SMS (ready for activation) |
| `templates.ts` | `server/notifications/templates.ts` | 12 notification templates covering all event types |
| `types.ts` | `server/notifications/types.ts` | TypeScript interfaces for notifications, channels, and providers |
| `reminderService.ts` | `server/reminderService.ts` | Background service for 24-hour appointment reminders |

All 12 notification types have both email templates (with subject and HTML body) and SMS templates (short text body):

| Type | Trigger | Recipients |
|---|---|---|
| `booking_created` | New booking submitted | Provider |
| `booking_confirmed` | Booking confirmed by provider | Customer |
| `booking_cancelled` | Booking cancelled | Customer + Provider |
| `booking_completed` | Service marked complete | Customer |
| `payment_received` | Payment processed | Customer |
| `payment_failed` | Payment failed | Customer |
| `message_received` | New message in conversation | Recipient |
| `review_received` | New review posted | Provider |
| `reminder_24h` | 24 hours before appointment | Customer + Provider |
| `reminder_1h` | 1 hour before appointment | Customer + Provider |
| `subscription_cancelled` | Subscription cancelled | Provider |
| `subscription_updated` | Subscription tier changed | Provider |

**Files created/modified:**

| File | Change |
|---|---|
| `server/reminderService.ts` | New: background reminder service with processReminders(), startReminderService(), stopReminderService() |
| `server/_core/index.ts` | Modified: wired reminder service to start on server boot |
| `server/adminRouter.ts` | Modified: added `triggerReminders` admin procedure |
| `server/routers.ts` | Modified: added `notification.unreadCount` procedure, booking creation/update notifications already wired |
| `server/db.ts` | Already had: `getBookingsNeedingReminders()`, `markReminderSent()`, `createNotification()` |
| `server/notifications/index.ts` | Already had: `sendNotification()` dispatcher |
| `server/notifications/templates.ts` | Already had: all 12 templates including `reminder_24h` and `reminder_1h` |
| `client/src/pages/AdminDashboard.tsx` | Modified: subscription analytics panel |
| `client/src/pages/ProviderOnboarding.tsx` | New: multi-step onboarding wizard |
| `server/phase11.test.ts` | New: 21 tests for notifications, reminders, admin trigger, templates |

**Tests:** 21 new tests in `phase11.test.ts` covering:
- Notification router (list, unread count, create, mark as read)
- Reminder database helpers (getBookingsNeedingReminders, markReminderSent)
- Reminder service (processReminders, start/stop lifecycle)
- Admin manual reminder trigger (authorization check)
- Booking notification integration (creation and status change triggers)
- Notification templates (all 12 types verified)

**Total test count:** 154 tests passing across 10 test files.


---

## Phase 12: Twilio SMS, Notifications Center UI, Email Unsubscribe

**Objective:** Activate Twilio SMS for text message reminders, build a full Notifications Center UI with dropdown and dedicated page, and implement email unsubscribe links with per-user notification preferences.

### 12.1 Twilio SMS Provider

Replaced the SMS stub with a production-ready Twilio integration:

| Component | Details |
|---|---|
| Provider class | `SMSProvider` in `server/notifications/providers/sms.ts` |
| SDK | `twilio` npm package |
| Credentials | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` via `webdev_request_secrets` |
| Graceful degradation | If `TWILIO_PHONE_NUMBER` is not set, SMS is silently skipped with a warning log |
| Template integration | Uses the same `getTemplate()` system as email — sends `template.body` as SMS text |

The SMS provider lazy-initializes the Twilio client on first use and validates all three credentials before attempting delivery. When the user purchases a Twilio phone number, SMS will automatically activate.

### 12.2 Notifications Center UI

Built a complete notification experience with two components:

**Notification Dropdown (NavHeader)**
- Replaces the old static bell icon link with an interactive dropdown
- Shows up to 8 recent notifications with type-specific emoji icons
- Displays unread count badge (polls every 15 seconds)
- "Mark all read" button clears all unread notifications
- Click-through to notification action URLs
- Outside-click dismissal
- "View all notifications" link to full page

**Notifications Page (`/notifications`)**
- Full-page notification list with all notifications
- Card-based layout with type badges, timestamps, and read indicators
- Mark individual or all notifications as read
- Settings gear icon links to notification preferences
- Back navigation to home
- Empty state with helpful messaging
- Auth-gated with sign-in prompt for unauthenticated users

### 12.3 Email Unsubscribe & Notification Preferences

**Database Schema:**
Added `notification_preferences` table with 17 columns:

| Column Group | Fields |
|---|---|
| Master toggles | `emailEnabled`, `smsEnabled`, `pushEnabled` |
| Email per-type | `bookingEmail`, `reminderEmail`, `messageEmail`, `paymentEmail`, `marketingEmail` |
| SMS per-type | `bookingSms`, `reminderSms`, `messageSms`, `paymentSms` |
| Unsubscribe | `unsubscribeToken` (unique, 64-char hex) |

**Unsubscribe Flow:**
1. Email provider auto-generates an `unsubscribeToken` for each user on first email send
2. Every email footer includes an "Unsubscribe from emails" link pointing to `/unsubscribe/:token`
3. The unsubscribe page shows current email preferences and a one-click "Unsubscribe from All Emails" button
4. After unsubscribing, user sees confirmation with option to re-manage preferences
5. Invalid/expired tokens show a clear error message

**Notification Settings Page (`/notification-settings`):**
- Master channel toggles (Email, SMS) at the top
- Per-type toggles organized by channel
- Disabling a master toggle visually dims and disables all sub-toggles
- Changes save immediately via tRPC mutation with toast feedback
- Accessible from notifications page (gear icon) and email footer ("Manage preferences" link)

**Preference Enforcement:**
- The reminder service checks `getNotificationPreferences()` before sending each notification
- The email provider checks `emailEnabled` before sending
- Both email and SMS channels respect per-type toggles (e.g., `reminderEmail`, `bookingSms`)

### 12.4 New Routes

| Route | Component | Auth |
|---|---|---|
| `/notifications` | `Notifications.tsx` | Protected |
| `/notification-settings` | `NotificationSettings.tsx` | Protected |
| `/unsubscribe/:token` | `Unsubscribe.tsx` | Public |

### 12.5 tRPC Endpoints Added/Modified

| Endpoint | Type | Auth | Purpose |
|---|---|---|---|
| `notification.markAllRead` | Mutation | Protected | Mark all notifications as read |
| `notification.getPreferences` | Query | Protected | Get user's notification preferences |
| `notification.updatePreferences` | Mutation | Protected | Update notification preferences |
| `notification.unsubscribe` | Mutation | Public | One-click email unsubscribe via token |
| `notification.getByToken` | Query | Public | Get email preferences by unsubscribe token |

### 12.6 Files Changed

| File | Change |
|---|---|
| `drizzle/schema.ts` | Added `notificationPreferences` table |
| `drizzle/0008_pale_lady_vermin.sql` | Migration for new table |
| `server/_core/env.ts` | Added `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| `server/db.ts` | Added 5 new helpers: `getNotificationPreferences`, `upsertNotificationPreferences`, `getPreferencesByUnsubscribeToken`, `unsubscribeAllEmail`, `markAllNotificationsAsRead` |
| `server/routers.ts` | Enhanced notification router with 5 new endpoints |
| `server/notifications/providers/sms.ts` | Rewritten with Twilio SDK integration |
| `server/notifications/providers/email.ts` | Added unsubscribe token generation and preference checking |
| `server/reminderService.ts` | Added SMS channel and preference checking |
| `client/src/App.tsx` | Added 3 new routes |
| `client/src/components/shared/NavHeader.tsx` | Replaced bell link with NotificationDropdown component |
| `client/src/pages/Notifications.tsx` | New: full notifications page |
| `client/src/pages/NotificationSettings.tsx` | New: notification preferences page |
| `client/src/pages/Unsubscribe.tsx` | New: public unsubscribe page |
| `server/phase12.test.ts` | New: 27 tests |

**Tests:** 27 new tests in `phase12.test.ts` covering:
- SMS provider instantiation, channel support, and graceful failures
- Email provider instantiation and graceful failures
- Notification preferences CRUD (create, read, update, toggle)
- Unsubscribe token generation, lookup, and one-click unsubscribe
- Public tRPC endpoints for unsubscribe flow
- Mark-all-read functionality (db helper and tRPC)
- Notification list filtering

**Total test count:** 181 tests passing across 11 test files.

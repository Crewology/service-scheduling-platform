# SkillLink Platform TODO

## Phase 1: Foundation & Database
- [x] Implement complete database schema with all tables
- [x] Seed 42 service categories into database
- [x] Create database query helpers

## Phase 2: Authentication & User Management
- [x] Extend user schema with customer/provider/admin roles
- [x] Implement Manus OAuth authentication
- [ ] Add additional OAuth providers (Google, Apple)
- [ ] Create user profile management

## Phase 3: Provider Onboarding & Profiles
- [x] Build provider registration flow
- [x] Create provider profile management
- [x] Implement business information forms
- [x] Add service area configuration
- [ ] Build verification document upload UI

## Phase 4: Service Catalog
- [x] Create service category browsing page
- [x] Build service creation and management
- [x] Implement flexible pricing models (fixed, hourly, package, custom)
- [ ] Add service photo gallery
- [ ] Create service search and filtering

## Phase 5: Availability Scheduling
- [ ] Build recurring weekly availability scheduler
- [ ] Implement date-specific overrides
- [ ] Add availability calendar view
- [ ] Create conflict detection logic

## Phase 6: Booking System
- [ ] Build booking request form
- [ ] Implement real-time availability checking
- [ ] Create booking status dashboard
- [ ] Add booking management for customers
- [ ] Add booking management for providers
- [ ] Implement location management (mobile/fixed)

## Phase 7: Payment Processing
- [ ] Integrate Stripe Connect for providers
- [ ] Implement deposit payment flow
- [ ] Add full payment option
- [ ] Build escrow management
- [ ] Create automatic payout system
- [ ] Implement tiered refund policies
- [ ] Add payment receipt generation

## Phase 8: Messaging System
- [ ] Build conversation threading
- [ ] Implement real-time messaging
- [ ] Add message notifications
- [ ] Create booking context in messages

## Phase 9: Reviews & Ratings
- [ ] Build review submission form
- [ ] Implement star rating system
- [ ] Add provider response capability
- [ ] Create review moderation
- [ ] Calculate and display average ratings

## Phase 10: Notifications
- [ ] Implement email notification system
- [ ] Add booking confirmation emails
- [ ] Create reminder notifications
- [ ] Build status update notifications
- [ ] Add payment receipt emails

## Phase 11: Testing & Polish
- [x] Write comprehensive vitest tests
- [ ] Test complete booking flow
- [ ] Verify payment processing
- [ ] Test mobile responsiveness
- [ ] Create user documentation
- [ ] Save checkpoint for deployment

## Phase 12: Embeddable Provider Profiles & Booking Widgets
- [ ] Design public provider profile URL structure (e.g., skilllink.com/p/provider-name)
- [ ] Create standalone public provider profile pages
- [ ] Build embeddable booking widget (iframe-based)
- [ ] Implement widget customization options (colors, branding, layout)
- [ ] Create widget code generator in provider dashboard
- [ ] Add widget installation guide and documentation
- [ ] Build widget preview functionality
- [ ] Implement CORS and security for embedded widgets
- [ ] Add analytics tracking for embedded bookings
- [ ] Create custom domain support for provider profiles (optional)
- [ ] Test widget on various website platforms (WordPress, Wix, Squarespace, custom HTML)

## Immediate Priority: Core Platform Features

### Provider Dashboard
- [x] Create provider dashboard layout with navigation
- [x] Build "My Services" management page (create, edit, delete services)
- [x] Implement "Manage Availability" calendar interface
- [x] Add weekly recurring schedule editor
- [x] Create date-specific override functionality
- [x] Build "My Bookings" list with status filters
- [ ] Add booking detail view and status management
- [x] Create earnings/analytics overview
- [x] Create service creation form with all pricing models

### Customer Booking Flow
- [ ] Build service detail page with booking form
- [ ] Implement real-time availability calendar
- [ ] Create time slot selection interface
- [ ] Add booking summary and review step
- [ ] Build payment processing page
- [ ] Create booking confirmation page
- [ ] Add "My Bookings" customer dashboard

### Stripe Payment Integration
- [ ] Add Stripe feature to project (webdev_add_feature)
- [ ] Configure Stripe Connect for provider payouts
- [ ] Implement deposit payment flow
- [ ] Add full payment option
- [ ] Build escrow management system
- [ ] Create automatic payout logic
- [ ] Implement refund policy based on cancellation timing
- [ ] Add payment receipt generation

## Bug Fixes
- [x] Fix nested anchor tag error on homepage

## Phase 1: Core Transaction Flow (IN PROGRESS)

### Real-time Availability System
- [x] Create time slot generation utility function
- [x] Fetch provider schedule and overrides in ServiceDetail
- [x] Query existing bookings to block unavailable slots
- [x] Build interactive time slot selection UI
- [x] Add conflict detection logic
- [x] Implement timezone handling### Booking Submission Flow
- [x] Create booking summary component
- [x] Build booking review step with customer info
- [x] Implement booking confirmation page
- [x] Add booking number generation
- [x] Build customer bookings dashboard
- [x] Add booking status trackingcellation flow

### Stripe Payment Integration
- [ ] Set up Stripe Connect for providers
- [ ] Create checkout session API endpoint
- [ ] Implement deposit payment flow
- [ ] Build webhook handler for payment confirmation
- [ ] Add automatic payout logic
- [ ] Implement refund policy engine
- [ ] Generate payment receipts

## Phase 2: Payment, Messaging, and Notifications

### Stripe Payment Integration
- [x] Create Stripe checkout session endpoint
- [x] Add payment processing to booking flow
- [x] Implement deposit payment handling
- [x] Build payment confirmation page
- [x] Add Stripe webhook handler for payment events
- [ ] Implement automatic provider payouts (requires Stripe Connect)
- [ ] Add refund handling for cancellations

### Messaging System
- [x] Create messages database table
- [x] Build message router with send/list procedures
- [x] Create messaging UI component
- [x] Add conversation threading by booking
- [x] Implement real-time message updates (5s polling)
- [x] Add unread message indicators

### Email Notifications
- [ ] Set up email service integration
- [ ] Create email templates for booking confirmations
- [ ] Add booking status update emails
- [ ] Implement reminder emails before appointments
- [ ] Add payment receipt emails
- [ ] Include unsubscribe links in all emails


## Code Audit & Refactoring
- [x] Audit codebase for code duplication
- [x] Identify repeated patterns in components
- [x] Extract common utilities and helpers
- [ ] Refactor duplicated database queries
- [x] Create reusable UI components
- [x] Document architecture decisions

## Phase 3: Notifications, Search, and Admin

### Notification System (Email + SMS-ready)
- [x] Design unified notification architecture supporting multiple channels
- [x] Create notification service abstraction layer
- [x] Implement email notification provider
- [x] Build SMS notification provider (stub for future)
- [x] Create notification templates for all events
- [ ] Add email unsubscribe functionality
- [ ] Build notification preferences UI
- [ ] Add notification history tracking

### Search & Filtering
- [x] Implement service search by keywords
- [ ] Add location-based filtering (future enhancement)
- [x] Create price range filters
- [ ] Add rating and review filters (needs review data)
- [x] Build category-based navigation
- [x] Implement sort options (price, rating, distance)
- [x] Add search results page with pagination

### Admin Dashboard
- [ ] Create admin-only routes and guards
- [ ] Build user management interface
- [ ] Add provider verification workflow
- [ ] Create booking oversight and dispute resolution
- [ ] Implement platform analytics and reporting
- [ ] Add transaction monitoring
- [ ] Build content moderation tools


## Phase 4: Twilio SMS, Admin Dashboard, and Reviews

### Twilio SMS Setup
- [ ] Guide user through Twilio account creation
- [ ] Configure Twilio phone number
- [ ] Add Twilio credentials to environment variables
- [ ] Activate SMS provider in notification system
- [ ] Test SMS notifications for bookings

### Admin Dashboard
- [x] Create admin-only route guards
- [x] Build admin dashboard layout
- [x] Implement user management (view, suspend, delete users)
- [x] Create provider verification interface
- [x] Build transaction monitoring and dispute resolution
- [x] Add platform analytics (bookings, revenue, user growth)
- [x] Implement provider approval workflow
- [ ] Add system health monitoring

### Review & Rating System
- [x] Create review submission form for completed bookings
- [ ] Build review display on service detail pages
- [ ] Add provider response capability
- [x] Implement rating aggregation and display
- [ ] Add review moderation tools for admins
- [ ] Create review notification emails
- [ ] Build "My Reviews" page for customers


## Phase 5: Review Display & Provider Response
- [x] Create reusable ReviewCard component
- [x] Create ReviewList component with pagination
- [x] Add review fetching to service detail page
- [x] Display average rating and review count
- [x] Build provider response form
- [x] Add response display in review cards
- [ ] Implement response notifications
- [ ] Test review display and responses

## Phase 6: Dev & Testing Environment
- [ ] Verify project health after sandbox restore
- [ ] Create comprehensive seed data script with test accounts
- [ ] Seed test providers across multiple service categories
- [ ] Seed test services with various pricing models
- [ ] Seed test bookings in various states
- [ ] Seed test reviews and ratings
- [ ] Build backend API test suite covering all routers
- [ ] Add frontend dev tools (test user switcher, data inspector)
- [ ] Create end-to-end test scenarios documentation
- [ ] Add mobile responsiveness testing

## Phase 6: Dev & Testing Environment (COMPLETED)
- [x] Fix all failing backend tests (63/63 passing across 5 test files)
- [x] Fix router API mismatches (provider.create, service.create, booking.create, review.create, review.addResponse)
- [x] Fix role enum mismatch in test files (user → customer)
- [x] Fix platform.test.ts expectations to match new router return types
- [x] Fix review.test.ts role enum and API field names
- [x] Add adminRouter.updateProviderVerification procedure
- [x] Add pagination support to admin.listUsers and admin.listBookings
- [x] Build DevToolsPanel floating component for frontend testing
- [x] DevToolsPanel: auth status display (role, name, email, user ID)
- [x] DevToolsPanel: quick navigation links for each role
- [x] DevToolsPanel: testing workflow guide
- [x] DevToolsPanel: platform info (categories, commission, payment mode)

## Phase 7: Next Steps Implementation
### Seed Test Data
- [x] Create comprehensive seed data script (seed-data.mjs)
- [x] Seed 5+ test providers across different categories
- [x] Seed 10+ test services with various pricing models
- [x] Seed test bookings in various states (pending, confirmed, completed, cancelled)
- [x] Seed test reviews and ratings
- [x] Seed test availability schedules for providers

### Unread Message Indicators
- [x] Add unread count query to message router
- [x] Create NavHeader component with useUnreadMessages polling
- [x] Add badge indicators to navigation across all pages
- [x] Show unread count in NavHeader message icon

### Interactive Booking Calendar
- [x] Build date picker calendar component for service detail page
- [x] Connect availability schedule to calendar (highlight available days)
- [x] Create time slot selection grid based on provider availability
- [x] Show booked/unavailable slots as disabled
- [x] Integrate booking form with calendar selection
- [x] Add step-by-step booking flow (date → time → details → confirm)
- [x] Add breadcrumb navigation on service detail page
- [x] Add booking summary before submission

## Phase 8: Build Documentation & MVP Completion
### Documentation
- [x] Create comprehensive BUILD_LOG.md documenting all phases
- [x] Document database schema and relationships
- [x] Document API endpoints (all tRPC procedures)
- [x] Document frontend pages and routing
- [x] Document authentication and authorization flow
- [x] Document payment integration details
- [x] Create ARCHITECTURE.md explaining folder structure and data flow

### MVP Gap Audit & Completion
- [x] Audit all implemented features vs MVP requirements
- [x] Identify and fix any broken or incomplete flows
- [x] Ensure all user roles have complete workflows
- [x] Verify end-to-end booking flow works
- [x] Verify payment flow works
- [x] Verify messaging flow works
- [x] Verify review flow works
- [x] Verify admin dashboard is fully functional
- [x] Clean up any placeholder or stub features

### MVP Gap Fixes - Batch 1 (Core)
- [x] Implement real admin stats queries (total users, providers, bookings, revenue)
- [x] Implement user suspension (actual DB update)
- [x] Implement user unsuspension
- [x] Implement profile update persistence
- [x] Add service editing procedure and UI
- [x] Add service deletion procedure and UI
- [x] Add provider profile editing procedure and UI

### MVP Gap Fixes - Batch 2 (Polish)
- [x] Verify reviews display correctly on service detail page
- [x] Add real earnings data to provider dashboard
- [x] Ensure booking detail view works from provider dashboard
- [x] Create UserProfile page with edit functionality
- [x] Add profile link to NavHeader
- [x] Write 14 new MVP gap tests (102 total tests passing)
- [x] Add provider rejection procedure

## Phase 9: Provider-First Pivot (Stripe Connect & Public Profiles)
### Schema Changes
- [x] Add profileSlug field to serviceProviders table
- [x] Add stripeAccountStatus enum (not_connected, onboarding, active, restricted)
- [x] Add stripeOnboardingComplete boolean field

### Stripe Connect Backend
- [x] Create stripeConnectRouter with onboarding, status, dashboard link, balance procedures
- [x] Update stripeRouter to use destination charges (money goes to provider)
- [x] Implement 15% platform application fee on bookings
- [x] Add getOnboardingLink procedure for resuming incomplete onboarding

### Public Provider Profiles
- [x] Create getProviderBySlug db helper
- [x] Create getPublicServicesByProvider db helper
- [x] Create getPublicReviewsByProvider db helper
- [x] Add generateSlug procedure (auto-generates from business name)
- [x] Add updateSlug procedure with validation (lowercase, alphanumeric, min 3 chars)
- [x] Add getBySlug public procedure (no auth required)
- [x] Add getPublicServices public procedure
- [x] Build PublicProviderProfile page at /p/:slug route

### Provider Dashboard Updates
- [x] Add Payments tab with Stripe Connect onboarding flow
- [x] Add "My Page" tab with shareable profile link management
- [x] Add slug customization UI
- [x] Add copy-to-clipboard for profile URL
- [x] Show Stripe balance (available, pending) when connected
- [x] Add "Open Stripe Dashboard" button for connected providers

### Testing
- [x] Write 12 Stripe Connect & public profile tests (114 total passing)
- [x] Test slug generation and update
- [x] Test slug validation (invalid chars, too short)
- [x] Test public profile access without auth
- [x] Test Stripe Connect status for unconnected providers
- [x] Test balance returns zero when no Stripe account
- [x] Test customer cannot access provider-only endpoints
- [x] Test getDashboardLink requires Stripe account

## Phase 10: Photo Uploads, Refund Automation, Subscription Tiers

### Service Photo Uploads
- [x] Create photo upload tRPC endpoint (server-side S3 upload)
- [x] Add PhotoUpload component for service images
- [x] Add photo management dialog in ProviderDashboard
- [x] Display photos on service detail page (gallery with lightbox)
- [x] Display photos on public provider profile
- [x] Support multiple photos per service (tier-gated: Free=2, Basic/Premium=5)
- [x] Add photo deletion

### Cancellation & Refund Automation
- [x] Define cancellation policy engine (time-based refund tiers: 48h=100%, 24h=75%, 4h=50%, <4h=0%)
- [x] Create cancellation procedure with refund calculation
- [x] Wire Stripe refund processing in cancel procedure
- [x] Wire Stripe webhook for charge.refunded events
- [x] Update booking status on successful refund
- [x] Send notification to provider and customer on cancellation
- [x] Add cancellation UI to MyBookings page with reason dialog
- [x] Show refund amount and percentage in cancellation result

### Provider Subscription Tiers
- [x] Create providerSubscriptions table in database schema
- [x] Define Free/Basic/Premium tier limits and features
- [x] Change platform fee from 15% to 1% transaction fee
- [x] Create Stripe subscription products and prices in products.ts
- [x] Build subscription checkout flow (subscriptionRouter)
- [x] Implement feature gating: service limits (Free=3, Basic=10, Premium=unlimited)
- [x] Implement feature gating: photo limits (Free=2, Basic/Premium=5)
- [x] Implement feature gating: custom slug (Basic+ only)
- [x] Implement search priority boost for paid tiers
- [x] Add 14-day Premium trial option
- [x] Build SubscriptionManagement page for providers
- [x] Add subscription link in ProviderDashboard Payments tab
- [x] Wire Stripe webhook for subscription events (created, updated, deleted, payment_failed)
- [ ] Add upgrade prompts when limits are reached (toast notification added, could enhance)
- [x] Create subscription analytics for admin dashboard

### Testing
- [x] Write 19 tests for Phase 10 features (133 total passing)
- [x] Test photo access and authorization
- [x] Test cancellation with refund calculation
- [x] Test cancellation authorization (can't cancel others' bookings)
- [x] Test subscription tier feature gating (service limits, slug limits)
- [x] Test 1% fee calculation
- [x] Test tier limit helpers (canProviderAddService, canProviderAddPhoto)
- [x] Test search with priority boost
- [x] Test 14-day trial configuration

## Phase 11: Subscription Analytics, Provider Onboarding Wizard, Customer Notifications

### Subscription Analytics for Admin Dashboard
- [x] Add admin procedure for subscription analytics (MRR, active counts by tier, churn rate, conversion rates)
- [x] Build analytics panel in AdminDashboard with charts/cards
- [x] Show monthly recurring revenue (MRR) with trend
- [x] Show active subscriber counts by tier (Free/Basic/Premium)
- [x] Show conversion rates (Free→Basic, Basic→Premium)
- [x] Show churn rate (cancellations vs active)

### Provider Onboarding Wizard
- [x] Create ProviderOnboarding page with step-by-step flow
- [x] Step 1: Business profile (name, type, address, phone, bio)
- [x] Step 2: Add first service (category, name, price, description)
- [x] Step 3: Set availability schedule (weekly recurring)
- [x] Step 4: Connect Stripe account
- [x] Step 5: Choose subscription tier
- [x] Add onboarding progress tracking
- [x] Redirect new providers to wizard after registration
- [x] Add "Complete Setup" prompt for incomplete profiles

### Customer Notifications & Reminders
- [x] Add booking confirmation email on successful booking
- [x] Add booking status change notifications (confirmed, cancelled)
- [x] Create 24-hour reminder system for upcoming appointments
- [x] Add provider notification for new bookings
- [ ] Include unsubscribe link in all emails

### Testing
- [x] Write tests for subscription analytics queries
- [x] Write tests for onboarding progress tracking
- [x] Write tests for notification triggers
- [x] Write tests for reminder scheduling logic
- [x] 21 new Phase 11 tests (154 total passing across 10 test files)

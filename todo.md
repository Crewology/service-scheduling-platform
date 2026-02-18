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
- [ ] Add unread message indicators

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

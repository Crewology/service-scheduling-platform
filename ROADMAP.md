# SkillLink Development Roadmap

**Last Updated:** February 18, 2026  
**Current Status:** Foundation Complete (40%)  
**Target:** Production-Ready Marketplace

---

## Current State

The SkillLink platform has a solid foundation with database schema, authentication, provider onboarding, and service management complete. However, critical customer-facing features and payment processing remain incomplete, preventing production deployment.

**What Works:**
- Provider registration and profile management
- Service creation with flexible pricing models
- Availability scheduling with weekly schedules and overrides
- Category browsing and service discovery
- Basic dashboard interfaces

**What's Missing:**
- Functional booking flow with real-time availability
- Stripe payment processing and escrow
- Customer-provider messaging
- Reviews and ratings system
- Email notifications
- Search and filtering

---

## Phase 1: Core Transaction Flow (Priority 0 - Critical)

**Goal:** Enable end-to-end booking with secure payments

**Estimated Time:** 1-2 weeks

### 1.1 Real-time Availability System

Build the connection between provider schedules and customer booking calendars to show accurate available time slots.

**Tasks:**
- Fetch provider's weekly schedule and date-specific overrides when loading service detail page
- Generate time slots based on service duration and provider's working hours
- Query existing bookings to identify unavailable slots
- Display available time slots in an interactive calendar UI
- Add conflict detection to prevent double-booking
- Implement timezone handling for multi-region support

**Technical Approach:**
- Modify `ServiceDetail.tsx` to call `trpc.availability.getProviderSchedule`
- Create time slot generation algorithm considering service duration
- Use date-fns for date manipulation and timezone conversion
- Add visual indicators for available vs. booked slots

### 1.2 Complete Booking Flow

Build the end-to-end customer booking experience from service selection to confirmation.

**Tasks:**
- Create time slot selection UI with date picker and time grid
- Build booking summary component showing service details, pricing, and deposit amount
- Implement booking review step with editable customer information
- Add location input for mobile services with address autocomplete
- Create booking submission logic that validates availability and creates booking record
- Build booking confirmation page with booking number and next steps
- Add "My Bookings" customer dashboard showing all bookings with status filters
- Implement booking cancellation flow with refund policy display

**Technical Approach:**
- Use React Hook Form for multi-step booking form
- Add Google Maps autocomplete for address input
- Create booking state machine (pending → confirmed → in-progress → completed → cancelled)
- Store booking in database with unique booking number (BK-XXXXXX format)

### 1.3 Provider Booking Management

Give providers tools to manage incoming booking requests and track service delivery.

**Tasks:**
- Build booking detail view showing customer info, service details, and timeline
- Add accept/decline actions for pending bookings
- Implement status update functionality (mark as in-progress, mark as completed)
- Create booking timeline showing all status changes and messages
- Add customer contact information display with privacy controls
- Build earnings calculator showing payout amount after platform fee

**Technical Approach:**
- Create `BookingDetail.tsx` component with tabbed interface
- Add status transition validation (can't skip states)
- Implement audit log for all booking changes
- Calculate platform fee and provider payout dynamically

### 1.4 Stripe Payment Integration

Integrate Stripe for secure payment processing, escrow management, and automatic provider payouts.

**Tasks:**
- Set up Stripe Connect for provider onboarding (collect bank details, verify identity)
- Create checkout session API endpoint that generates Stripe payment link
- Implement deposit payment flow (charge configurable % or fixed amount upfront)
- Build full payment option for services requiring 100% upfront
- Add escrow management to hold funds until service completion
- Create automatic payout logic that releases funds to provider after booking completion
- Implement webhook handler for payment_intent.succeeded, charge.refunded, etc.
- Build refund policy engine with tiered refunds based on cancellation timing
- Generate payment receipts and store transaction records
- Add Stripe Connect onboarding UI in provider dashboard

**Technical Approach:**
- Use Stripe Checkout for payment UI (redirect to Stripe hosted page)
- Store Stripe customer ID and payment intent ID in booking record
- Implement webhook signature verification for security
- Use Stripe Connect transfers for provider payouts
- Calculate platform fee (e.g., 10% of booking total)
- Handle refund scenarios: full refund (24h+ before), 50% refund (12-24h), no refund (<12h)

**Deliverable:** Customers can book services with real-time availability, pay securely via Stripe, and providers receive automatic payouts after service completion.

---

## Phase 2: Communication & Trust (Priority 1 - High)

**Goal:** Enable customer-provider communication and build marketplace trust

**Estimated Time:** 1 week

### 2.1 Messaging System

Build in-platform messaging for customers and providers to coordinate booking details.

**Tasks:**
- Create conversation threading UI with message history
- Implement real-time messaging using WebSocket or polling
- Add message composition with text input and file attachments
- Build conversation list showing all active chats
- Display booking context in message thread (service, date, price)
- Add message notifications (email alerts for new messages)
- Implement read/unread status tracking
- Add message search within conversations

**Technical Approach:**
- Use tRPC subscriptions for real-time updates
- Store messages in database with conversationId linked to bookingId
- Use S3 for file attachment storage
- Send email notifications via platform notification system

### 2.2 Reviews & Ratings System

Build reputation system allowing customers to rate providers after service completion.

**Tasks:**
- Create review submission form (appears after booking marked complete)
- Implement 5-star rating system with half-star precision
- Add text review with character limit and formatting
- Build provider response capability (reply to reviews)
- Calculate and display average rating on provider profiles
- Show recent reviews on service detail pages
- Add review moderation tools (flag inappropriate content)
- Implement review verification (only customers who booked can review)

**Technical Approach:**
- Trigger review prompt 24h after booking completion
- Calculate average rating using weighted algorithm
- Display star rating visually using lucide-react icons
- Add review helpful/unhelpful voting system

### 2.3 Email Notification System

Implement comprehensive email notifications for all critical platform events.

**Tasks:**
- Build email template system with branded HTML templates
- Send booking confirmation emails to customer and provider
- Add booking reminder notifications (24h before service)
- Implement status update emails (confirmed, in-progress, completed, cancelled)
- Send payment receipt emails after successful payment
- Add message notification emails (new message alert)
- Create review request emails after booking completion
- Build notification preferences page (allow users to opt-out of specific emails)

**Technical Approach:**
- Use platform's built-in notification system
- Create reusable email templates with dynamic content
- Include booking details, links to platform, and call-to-action buttons
- Track email delivery status and open rates

**Deliverable:** Users can message each other, leave reviews, and receive timely email notifications for all booking events.

---

## Phase 3: Discovery & User Experience (Priority 2 - Medium)

**Goal:** Improve service discovery and overall user experience

**Estimated Time:** 1 week

### 3.1 Search & Filtering

Build powerful search and filtering to help customers find relevant services quickly.

**Tasks:**
- Implement keyword search across service names, descriptions, and categories
- Add location-based filtering (find providers within X miles of address)
- Build price range filter (min/max price slider)
- Add rating filter (show only 4+ star providers)
- Create service type filter (mobile, fixed-location, virtual)
- Implement availability filter (available today, this week, custom date)
- Add sorting options (price low-to-high, rating, distance, newest)
- Build search results page with grid/list view toggle

**Technical Approach:**
- Use full-text search on MySQL for keyword matching
- Calculate distance using haversine formula or PostGIS
- Add database indexes on frequently filtered columns
- Implement pagination for large result sets

### 3.2 User Profile Management

Give users control over their account information and settings.

**Tasks:**
- Build profile editing page (update name, email, phone, profile photo)
- Add profile photo upload with image cropping
- Implement password change functionality (if using email/password auth)
- Create account settings page (notification preferences, privacy settings)
- Add delete account option with confirmation dialog
- Build account activity log (login history, booking history)

**Technical Approach:**
- Use React Hook Form for profile editing
- Upload profile photos to S3 using storage helpers
- Hash passwords with bcrypt before storing
- Soft delete accounts (set deletedAt timestamp)

### 3.3 Provider Verification System

Build trust by verifying provider credentials and displaying verification badges.

**Tasks:**
- Create document upload UI (license, insurance, business registration)
- Add verification status display (verified badge on provider profiles)
- Build admin verification queue (approve/reject submitted documents)
- Implement verification expiration reminders (annual renewal)
- Add background check integration (optional third-party service)
- Create verification requirements page (explain what documents are needed)

**Technical Approach:**
- Upload documents to S3 with secure access controls
- Store verification status in provider table (pending, verified, rejected, expired)
- Send email notifications when verification status changes
- Display verification badge prominently on provider cards

### 3.4 Mobile Optimization

Ensure excellent mobile experience across all platform features.

**Tasks:**
- Add responsive mobile navigation with hamburger menu
- Optimize booking calendar for touch interactions
- Make all forms mobile-friendly with large touch targets
- Ensure responsive dashboard layouts (stack cards vertically on mobile)
- Test on actual mobile devices (iOS Safari, Android Chrome)
- Add mobile-specific features (click-to-call provider, mobile map integration)
- Optimize images for mobile bandwidth

**Technical Approach:**
- Use Tailwind responsive classes (sm:, md:, lg:)
- Test on real devices using BrowserStack or similar
- Add touch event handlers for calendar interactions
- Implement lazy loading for images

**Deliverable:** Users can easily search and filter services, manage their profiles, trust verified providers, and enjoy excellent mobile experience.

---

## Phase 4: Platform Management & Scale (Priority 2 - Medium)

**Goal:** Give admins tools to manage and grow the platform

**Estimated Time:** 1 week

### 4.1 Admin Dashboard

Build comprehensive admin interface for platform management.

**Tasks:**
- Create admin-only dashboard (check user.role === 'admin')
- Build user management (view all users, edit roles, suspend accounts)
- Add provider verification queue (review submitted documents)
- Implement booking oversight (view all bookings, resolve disputes)
- Create platform analytics (revenue, bookings, user growth charts)
- Add content moderation tools (flag reviews, messages, profiles)
- Build category management (add, edit, deactivate categories)
- Create system settings page (platform fee %, refund policies)

**Technical Approach:**
- Use DashboardLayout component for consistent admin UI
- Add adminProcedure middleware to protect admin-only routes
- Use Recharts for analytics visualizations
- Implement role-based access control (RBAC)

### 4.2 Testing & Quality Assurance

Ensure platform stability and reliability through comprehensive testing.

**Tasks:**
- Write vitest tests for all new features (booking, payment, messaging)
- Test complete booking flow end-to-end (customer + provider perspective)
- Verify Stripe payment processing with test cards (4242 4242 4242 4242)
- Test refund scenarios (cancellation at different times)
- Verify email notifications are sent correctly
- Test mobile responsiveness on real devices
- Perform security audit (SQL injection, XSS, CSRF protection)
- Load test with simulated concurrent bookings

**Technical Approach:**
- Achieve 80%+ test coverage for critical paths
- Use Stripe test mode for all payment testing
- Create test data generator for realistic scenarios
- Document all test cases and expected outcomes

### 4.3 Documentation & Onboarding

Create user documentation and onboarding flows to reduce support burden.

**Tasks:**
- Write customer guide (how to book, pay, message, review)
- Create provider guide (how to set up profile, manage bookings, get paid)
- Build interactive onboarding tours (first-time user walkthrough)
- Add FAQ page (common questions about bookings, payments, refunds)
- Create video tutorials (optional, for complex features)
- Write API documentation (if exposing public API)

**Technical Approach:**
- Use Markdown for documentation
- Host documentation on platform or separate docs site
- Add tooltips and help text throughout UI
- Create onboarding checklist for new providers

**Deliverable:** Platform is production-ready with admin tools, comprehensive testing, and user documentation.

---

## Phase 5: Embeddable Widgets (Priority 3 - Optional)

**Goal:** Allow providers to embed booking functionality on their own websites

**Estimated Time:** 1 week

### 5.1 Public Provider Profiles

Create standalone public profile pages that providers can share.

**Tasks:**
- Design public profile URL structure (skilllink.com/p/provider-slug)
- Build public profile page (no login required)
- Add custom slug generation (business-name → business-name-slug)
- Implement social sharing meta tags (Open Graph, Twitter Cards)
- Add QR code generation for offline marketing
- Create profile customization options (colors, banner image)

**Technical Approach:**
- Use server-side rendering for SEO
- Generate unique slugs with collision detection
- Add canonical URLs for SEO

### 5.2 Embeddable Booking Widget

Build iframe-based widget that providers can embed on their websites.

**Tasks:**
- Create standalone booking widget page (minimal UI, no header/footer)
- Build widget customization options (colors, branding, layout)
- Add widget code generator in provider dashboard (copy-paste iframe code)
- Implement CORS and security for cross-origin embedding
- Create widget preview functionality (see how it looks before embedding)
- Add analytics tracking for embedded bookings (source attribution)
- Test widget on WordPress, Wix, Squarespace, custom HTML sites
- Write widget installation guide (step-by-step for each platform)

**Technical Approach:**
- Use iframe with postMessage for cross-origin communication
- Generate unique widget URLs with provider ID
- Add widget-specific CSS for minimal styling
- Track widget source in booking metadata

**Deliverable:** Providers can embed booking widgets on their existing websites, expanding platform reach.

---

## Success Metrics

After launch, track these metrics to measure platform health and growth:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Booking Conversion Rate** | >10% | Service views → completed bookings |
| **Payment Success Rate** | >95% | Booking submissions → successful payments |
| **Provider Onboarding Time** | <15 min | Signup → first service listed |
| **Customer Satisfaction** | >4.5 stars | Average rating across all bookings |
| **Response Time** | <2 hours | Provider response to booking requests |
| **Repeat Booking Rate** | >30% | Customers who book 2+ times |
| **Platform Fee Revenue** | Track | Total revenue from booking fees |
| **Active Providers** | Track | Providers with ≥1 booking/month |

---

## Technical Debt & Improvements

Address these technical issues during development:

**Testing:**
- Fix test isolation issues (3 tests failing due to shared database state)
- Add database cleanup between tests
- Increase test coverage to 80%+

**Error Handling:**
- Add user-friendly error messages for all API calls
- Implement error boundary components
- Add retry logic for failed API requests

**Performance:**
- Add database indexes for frequently queried columns
- Implement caching for category and service lists
- Optimize image loading with lazy loading and CDN
- Add loading states and skeleton screens

**Code Quality:**
- Split large files (routers.ts, db.ts) into feature modules
- Remove `any` types and improve type safety
- Add JSDoc comments for complex functions
- Implement consistent error handling patterns

**Security:**
- Add rate limiting for API endpoints
- Implement CSRF protection
- Add input sanitization for all user inputs
- Audit third-party dependencies for vulnerabilities

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Core Transaction Flow** | 1-2 weeks | Functional booking + payments |
| **Phase 2: Communication & Trust** | 1 week | Messaging + reviews + notifications |
| **Phase 3: Discovery & UX** | 1 week | Search + profiles + mobile + verification |
| **Phase 4: Platform Management** | 1 week | Admin tools + testing + docs |
| **Phase 5: Embeddable Widgets** | 1 week (optional) | Public profiles + embed widgets |
| **Total** | **4-6 weeks** | Production-ready marketplace |

---

## Next Immediate Actions

Start with these three tasks to begin Phase 1:

1. **Build Real-time Availability System** - Connect service detail calendar to provider schedules and show available time slots
2. **Complete Booking Submission Flow** - Implement booking creation, confirmation page, and customer dashboard
3. **Integrate Stripe Checkout** - Set up payment processing with deposits and automatic payouts

**Estimated Time:** 3-4 days for all three tasks

These three features unlock the core value proposition: customers can book and pay for services, and providers can receive bookings and get paid. Everything else builds on this foundation.

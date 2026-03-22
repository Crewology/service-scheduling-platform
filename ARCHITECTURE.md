# OlogyCrew Platform — Architecture Guide

This document explains the folder structure, data flow, and conventions used in the OlogyCrew platform. Read this before adding new features or debugging issues.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | 19.x |
| Styling | Tailwind CSS + shadcn/ui | 4.x |
| Routing (client) | Wouter | 3.x |
| API Layer | tRPC | 11.x |
| Backend | Express | 4.x |
| ORM | Drizzle ORM | 0.x |
| Database | MySQL (TiDB) | 8.x compatible |
| Payments | Stripe | Latest |
| Auth | Manus OAuth | Built-in |
| Serialization | Superjson | Built-in |

---

## Folder Structure

```
service-scheduling-platform/
├── client/                      # Frontend application
│   ├── public/                  # Static assets (served at /)
│   ├── src/
│   │   ├── _core/hooks/         # Auth hook (useAuth.ts) — DO NOT EDIT
│   │   ├── components/
│   │   │   ├── shared/          # Reusable business components (NavHeader, ReviewCard, etc.)
│   │   │   ├── ui/              # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   │   │   ├── DevToolsPanel.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── Map.tsx
│   │   ├── contexts/            # React contexts (ThemeContext)
│   │   ├── hooks/               # Custom hooks (useProtectedPage, useBookingDetails, usePayment)
│   │   ├── lib/                 # Utility libraries (trpc client, dateUtils, utils)
│   │   ├── pages/               # Page-level components (one per route)
│   │   ├── App.tsx              # Route definitions and layout
│   │   ├── main.tsx             # React entry point with providers
│   │   └── index.css            # Global styles and Tailwind theme
│   └── index.html               # HTML shell
├── drizzle/                     # Database layer
│   ├── schema.ts                # Table definitions and types — EDIT HERE for schema changes
│   └── relations.ts             # Table relationships
├── server/                      # Backend application
│   ├── _core/                   # Framework plumbing — DO NOT EDIT
│   │   ├── context.ts           # tRPC context builder (injects user)
│   │   ├── cookies.ts           # Cookie configuration
│   │   ├── env.ts               # Environment variable access
│   │   ├── llm.ts               # LLM integration helper
│   │   ├── notification.ts      # Owner notification helper
│   │   ├── oauth.ts             # Manus OAuth handler
│   │   ├── sdk.ts               # Forge API SDK
│   │   ├── systemRouter.ts      # System tRPC procedures
│   │   ├── trpc.ts              # tRPC initialization (publicProcedure, protectedProcedure)
│   │   └── vite.ts              # Vite dev server bridge
│   ├── notifications/           # Multi-channel notification system
│   │   ├── index.ts             # NotificationService singleton
│   │   ├── types.ts             # Notification types and interfaces
│   │   ├── templates.ts         # Email/SMS templates for all events
│   │   └── providers/
│   │       ├── email.ts         # Email provider (Manus Forge API)
│   │       └── sms.ts           # SMS provider (stub for Twilio)
│   ├── db.ts                    # Database query helpers — EDIT HERE for new queries
│   ├── routers.ts               # Main tRPC router — EDIT HERE for new procedures
│   ├── adminRouter.ts           # Admin-only procedures
│   ├── stripeRouter.ts          # Stripe payment procedures
│   ├── stripeWebhook.ts         # Stripe webhook handler
│   ├── products.ts              # Pricing calculation helpers
│   ├── storage.ts               # S3 file storage helpers
│   └── *.test.ts                # Vitest test files
├── shared/                      # Code shared between client and server
│   ├── timeSlots.ts             # Time slot generation utility
│   ├── types.ts                 # Unified type exports
│   └── const.ts                 # Shared constants
├── storage/                     # S3 storage configuration
├── BUILD_LOG.md                 # Chronological build history (this project)
├── ARCHITECTURE.md              # This file
└── todo.md                      # Feature tracking
```

---

## Data Flow

### Request Lifecycle

```
Browser → React Component → trpc.*.useQuery/useMutation
    → HTTP POST /api/trpc/*
    → Express middleware (cookie parsing, session)
    → tRPC context builder (injects ctx.user from session)
    → Router procedure (publicProcedure or protectedProcedure)
    → db.* helper function (Drizzle ORM query)
    → MySQL database
    → Response flows back through the same chain
```

### Authentication Flow

```
1. User clicks "Sign In" → redirected to Manus OAuth portal
2. OAuth portal authenticates → redirects to /api/oauth/callback
3. Callback handler creates/updates user in DB → sets session cookie
4. Subsequent requests include cookie → context.ts extracts user
5. protectedProcedure checks ctx.user exists
6. adminProcedure additionally checks ctx.user.role === "admin"
```

### Booking Flow

```
1. Customer browses /browse → selects category → views services
2. Customer opens /service/:id → selects date on calendar
3. Calendar fetches provider availability (schedule + overrides + existing bookings)
4. Customer selects time slot → enters location details → reviews pricing
5. booking.create → generates booking number, calculates pricing
6. Customer clicks "Pay" → stripe.createCheckoutSession → Stripe Checkout
7. Stripe webhook → checkout.session.completed → updates booking status
8. Email notification sent to customer and provider
9. Provider confirms booking → status: confirmed
10. Service delivered → provider marks complete → status: completed
11. Customer leaves review → provider rating recalculated
```

### Payment Flow

```
1. booking.create sets status: "pending" with calculated pricing
2. stripe.createCheckoutSession creates Stripe session with booking metadata
3. Customer completes payment on Stripe Checkout page
4. Stripe fires checkout.session.completed webhook
5. stripeWebhook.ts verifies signature, extracts bookingId from metadata
6. Updates booking with stripePaymentIntentId and payment timestamp
7. Sends email notification to customer
```

---

## Adding New Features

### Adding a new database table

1. Define the table in `drizzle/schema.ts`
2. Export the type: `export type NewTable = typeof newTable.$inferSelect`
3. Run `pnpm db:push` to apply the migration
4. Add query helpers in `server/db.ts`

### Adding a new API endpoint

1. Add the query helper in `server/db.ts`
2. Add the procedure in `server/routers.ts` (or a new router file)
3. If it is a new router, register it in the `appRouter` at the bottom of `routers.ts`
4. Use `publicProcedure` for unauthenticated access, `protectedProcedure` for authenticated
5. Write a test in `server/*.test.ts`

### Adding a new page

1. Create the page component in `client/src/pages/NewPage.tsx`
2. Register the route in `client/src/App.tsx`
3. Add navigation links in `NavHeader.tsx` or relevant pages
4. Use `trpc.*.useQuery/useMutation` for data fetching

### Adding a new notification type

1. Add the template in `server/notifications/templates.ts`
2. Call `sendNotification({ type, channel, recipient, data })` from the relevant procedure or webhook handler

---

## Off-Limits Areas

The following directories contain framework-level code that should not be modified:

- `server/_core/` — OAuth, context, tRPC initialization, Vite bridge
- `client/src/_core/` — Auth hook
- `client/src/components/ui/` — shadcn/ui primitives (use as-is, do not customize)

---

## Testing Conventions

- All test files live in `server/*.test.ts`
- Tests use the tRPC `createCaller` pattern to test procedures directly
- Test users are created with unique timestamp-based IDs to avoid collisions
- Run all tests: `pnpm test`
- Run a specific test file: `npx vitest run server/platform.test.ts`

---

## Database Conventions

- All timestamps are stored as UTC
- Monetary values use `decimal(10,2)` — never float
- Date strings use `YYYY-MM-DD` format (stored as varchar)
- Time strings use `HH:MM` or `HH:MM:SS` format
- Soft deletes use `deletedAt` timestamp (null = active)
- All tables have `createdAt` timestamp with `defaultNow()`

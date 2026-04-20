# OlogyCrew Developer Guide

> **Audience:** Development team members who need to understand, maintain, and extend the OlogyCrew Service Scheduling Platform.
>
> **Last Updated:** April 2026

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Decisions & Rationale](#2-technology-decisions--rationale)
3. [Data Flow — End to End](#3-data-flow--end-to-end)
4. [Component Responsibilities](#4-component-responsibilities)
5. [Blast Radius Analysis](#5-blast-radius-analysis)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Database Architecture](#7-database-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-Time System (SSE)](#9-real-time-system-sse)
10. [Payment System (Stripe)](#10-payment-system-stripe)
11. [Notification System](#11-notification-system)
12. [File Storage (S3)](#12-file-storage-s3)
13. [Background Jobs & Schedulers](#13-background-jobs--schedulers)
14. [Development Guidelines](#14-development-guidelines)
15. [Testing Patterns](#15-testing-patterns)
16. [Known Gotchas & War Stories](#16-known-gotchas--war-stories)
17. [Glossary](#17-glossary)

---

## 1. System Architecture Overview

OlogyCrew is a **multi-vendor service marketplace** that connects service providers (barbers, DJs, handymen, fitness trainers, etc.) with customers who want to book their services. The platform handles the full lifecycle: discovery, booking, payment, communication, and reviews.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  React 19 + Tailwind 4 + tRPC React Query + Service Worker (PWA)   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS (JSON-RPC via /api/trpc)
                                   │ SSE via /api/sse/notifications
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (Express 4)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  tRPC 11 │  │  OAuth   │  │  Stripe  │  │  Express Routes   │  │
│  │ (22 rtrs)│  │ Callback │  │ Webhook  │  │ (OG, Cal, Export) │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └───────────────────┘  │
│       │                                                             │
│  ┌────▼──────────────────────────────────────────────────────────┐ │
│  │  DB Layer (Drizzle ORM)  │  SSE Manager  │  Notification Svc  │ │
│  └──────────┬───────────────┴───────────────┴────────────────────┘ │
└─────────────┼───────────────────────────────────────────────────────┘
              │
    ┌─────────▼─────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐
    │  TiDB (MySQL)     │   │  S3      │   │  Stripe  │   │ Twilio │
    │  28 tables        │   │  Files   │   │  Payments│   │  SMS   │
    └───────────────────┘   └──────────┘   └──────────┘   └────────┘
```

### Request Lifecycle (Simplified)

1. **Browser** makes a tRPC call (e.g., `trpc.booking.create.useMutation()`)
2. **Express** receives the request at `/api/trpc`
3. **tRPC middleware** creates context — authenticates the user via JWT cookie
4. **Router procedure** executes business logic (validation, DB queries, side effects)
5. **Drizzle ORM** translates to SQL and queries TiDB
6. **Response** flows back through tRPC → superjson serialization → HTTP response
7. **React Query** updates the cache and re-renders the UI
8. **SSE** pushes real-time events to other connected users (if applicable)

---

## 2. Technology Decisions & Rationale

Every technology choice was made for a specific reason. Understanding the "why" helps you make consistent decisions when extending the platform.

| Technology | What It Does | Why We Chose It |
|---|---|---|
| **tRPC 11** | Type-safe API layer | Zero REST boilerplate. Types flow from server to client automatically. No API contracts to maintain. No Axios/fetch wrappers needed. |
| **React 19** | UI framework | Latest stable React with improved performance. Ecosystem maturity for a marketplace app. |
| **Tailwind 4** | CSS utility framework | Rapid UI development without CSS files. Consistent design tokens. Mobile-first responsive design. |
| **Express 4** | HTTP server | Battle-tested, middleware ecosystem (helmet, rate-limit, cookie-parser). tRPC has first-class Express adapter. |
| **Drizzle ORM** | Database queries | Type-safe SQL queries that match the schema. Schema-first workflow. No magic — you see the SQL. Lightweight compared to Prisma. |
| **TiDB (MySQL-compatible)** | Database | MySQL wire protocol compatibility. Managed cloud hosting. Horizontal scalability if needed. |
| **SSE (Server-Sent Events)** | Real-time updates | Simpler than WebSockets — works with existing HTTP infrastructure, no upgrade handshake, no sticky sessions needed. Unidirectional (server→client) is all we need for notifications. |
| **Stripe** | Payments | Industry standard for marketplace payments. Stripe Connect handles provider payouts. Webhook-driven architecture decouples payment state from our server. |
| **Twilio** | SMS notifications | Reliable SMS delivery. Handles opt-out compliance (STOP/START). Messaging Service SID for proper sender identification. |
| **S3 (via Manus proxy)** | File storage | Scalable object storage. Files served via CDN. No local filesystem dependency in production. |
| **Superjson** | Serialization | Preserves `Date`, `BigInt`, `Map`, `Set` across the wire. Drizzle returns `Date` objects — superjson ensures they arrive as `Date` on the client. |
| **Vitest** | Testing | Fast, Vite-native test runner. Compatible with Jest API. Parallel test execution. |

### Why NOT WebSockets?

WebSockets would require:
- Sticky sessions or a Redis pub/sub layer for multi-instance deployment
- Connection upgrade handling that some reverse proxies struggle with
- Bidirectional protocol when we only need server→client push

SSE gives us real-time push with standard HTTP. The client sends data via tRPC mutations (normal HTTP POST). This is architecturally simpler and works with any CDN/proxy.

### Why Two DB Layers?

The codebase has two database access patterns:

1. **`server/db-legacy.ts`** — The original monolithic file with ~117 helper functions. Still used by many routers.
2. **`server/db/*.ts`** — Modular files split by domain (users, services, bookings, etc.). The migration target.

Both share the same connection logic and retry behavior. The legacy file exists because splitting a 2000-line file mid-feature-development risked regressions. The modular files are the preferred pattern for new code. Both are re-exported through barrel files for backward compatibility.

---

## 3. Data Flow — End to End

### How a tRPC Call Works

```
Client Component                    Server
─────────────────                   ──────
trpc.booking.create.useMutation()
        │
        ▼
httpBatchLink → POST /api/trpc/booking.create
        │                           │
        │                           ▼
        │                    createContext(req, res)
        │                    → sdk.authenticateRequest(req)
        │                    → returns { user } or { user: null }
        │                           │
        │                           ▼
        │                    protectedProcedure middleware
        │                    → throws UNAUTHORIZED if no user
        │                           │
        │                           ▼
        │                    .input(z.object({...})) validation
        │                    → throws BAD_REQUEST if invalid
        │                           │
        │                           ▼
        │                    Business logic executes:
        │                    1. Check availability
        │                    2. Create booking record
        │                    3. Create Stripe checkout session
        │                    4. Send notifications (SSE + email)
        │                    5. Return booking data
        │                           │
        ▼                           ▼
React Query cache updated    superjson serializes response
UI re-renders                HTTP 200 with JSON body
```

### How SSE Push Works

```
1. User opens app → useSSE() hook creates EventSource("/api/sse/notifications")
2. Server authenticates via JWT cookie → sseManager.addClient(userId, res)
3. Connection stays open (HTTP streaming)
4. When something happens (new booking, message, etc.):
   → sseManager.sendToUser(userId, "notification", data)
   → res.write(`event: notification\ndata: ${JSON.stringify(data)}\n\n`)
5. Browser's EventSource fires the event listener
6. React state updates → UI shows toast/badge/indicator
7. Heartbeat every 30s keeps connection alive
8. On disconnect → exponential backoff reconnect (1s → 2s → 4s → ... → 30s max)
```

---

## 4. Component Responsibilities

### Server-Side Components

| Component | File(s) | Responsibility | Depends On |
|---|---|---|---|
| **Express Server** | `server/_core/index.ts` | HTTP server, middleware chain, route registration | All server components |
| **tRPC Router** | `server/routers.ts` + `server/routers/*.ts` | API procedures (22 routers, ~150+ procedures) | DB layer, SSE, Stripe, Notifications |
| **Auth Context** | `server/_core/context.ts` + `sdk.ts` | JWT cookie validation, user injection into context | Manus OAuth service |
| **DB Legacy** | `server/db-legacy.ts` | ~117 query helper functions (monolith) | TiDB via Drizzle |
| **DB Modular** | `server/db/*.ts` | Domain-specific query helpers (new pattern) | TiDB via Drizzle |
| **DB Connection** | `server/db/connection.ts` | Connection pooling, retry logic, `requireDb()` | DATABASE_URL env var |
| **SSE Manager** | `server/sseManager.ts` | Real-time event push to connected browsers | In-memory client map |
| **Notification Service** | `server/notifications/` | Multi-channel notifications (email, SMS, push) | Forge API (email), Twilio (SMS), Web Push |
| **Stripe Webhook** | `server/stripeWebhook.ts` | Payment event processing | Stripe API, DB layer |
| **Storage** | `server/storage.ts` | S3 file upload/download | Manus Forge API (S3 proxy) |
| **OG Tags** | `server/ogTags.ts` + `ogPageRoute.ts` | Social media preview metadata | DB layer (provider/service data) |
| **Calendar Feed** | `server/calendarFeed.ts` | iCal feed generation for calendar sync | DB layer (bookings) |
| **Reminder Service** | `server/reminderService.ts` | 24-hour booking reminders (runs every 15 min) | DB layer, Notification Service |
| **Review Reminder** | `server/reviewReminderService.ts` | Post-booking review prompts (runs every 30 min) | DB layer, Notification Service |
| **Credit Expiration** | `server/jobs/creditExpiration.ts` | Expires old referral credits (runs every 24 hrs) | DB layer |

### Client-Side Components

| Component | File(s) | Responsibility |
|---|---|---|
| **App Shell** | `client/src/App.tsx` | Route definitions, layout wrappers, auth guards |
| **tRPC Client** | `client/src/lib/trpc.ts` + `main.tsx` | tRPC provider setup, React Query config |
| **Auth Context** | `client/src/hooks/useAuth.ts` | Current user state, login/logout |
| **SSE Hook** | `client/src/hooks/useSSE.ts` | Real-time event subscription with auto-reconnect |
| **View Mode** | `client/src/contexts/ViewModeContext.tsx` | Provider/Customer view toggle |
| **NavHeader** | `client/src/components/NavHeader.tsx` | Global navigation, notifications, view switcher |
| **Service Worker** | `client/public/sw.js` | PWA offline support, push notification handling |

---

## 5. Blast Radius Analysis

**"Blast radius"** = what breaks, what degrades, and what keeps working when a component fails.

### 5.1 Database (TiDB) Goes Down

| Aspect | Impact |
|---|---|
| **Severity** | **CRITICAL — Platform-wide outage** |
| **What breaks** | All data reads and writes. Browse, Search, Bookings, Messages, Reviews, Provider profiles — everything that touches data. |
| **What still works** | SSE connections stay open (in-memory). JWT auth still validates (no DB lookup needed). Static assets serve normally. Service worker serves cached pages. |
| **User experience** | Error states with "Try Again" buttons appear. tRPC retries 3 times with exponential backoff before showing error. Offline-cached bookings still visible. |
| **Recovery** | Automatic. `getDb()` retries every 3 seconds. Once DB is back, next request succeeds. No manual intervention needed. |
| **Mitigation in place** | Retry logic in `getDb()`, `requireDb()` throws proper errors, frontend error states with retry buttons, tRPC query retry config (3 attempts). |

### 5.2 SSE Manager Fails

| Aspect | Impact |
|---|---|
| **Severity** | **LOW — Graceful degradation** |
| **What breaks** | Real-time typing indicators, instant message delivery, live notification badges, read receipts. |
| **What still works** | Everything. All data operations work normally. Messages are stored in DB and appear on next page load or poll. Notifications are stored and shown on next fetch. |
| **User experience** | Users don't see instant updates. They see changes on page refresh or when React Query refetches. Typing indicators disappear. "Live" badge goes away. |
| **Recovery** | Client auto-reconnects with exponential backoff (1s → 30s max). Server-side: singleton restarts with the process. |
| **Mitigation in place** | SSE is purely additive — the app works without it. Polling fallback (60s when SSE connected, 15s when disconnected). |

### 5.3 Stripe Goes Down

| Aspect | Impact |
|---|---|
| **Severity** | **MEDIUM — Payment operations blocked** |
| **What breaks** | New payment processing, subscription creation/changes, provider payout initiation, checkout sessions. |
| **What still works** | Browsing, searching, messaging, booking creation (without payment), profile management, reviews, notifications, all non-payment features. Existing subscriptions remain active (status stored in our DB). |
| **User experience** | "Payment failed" error on checkout. Subscription management shows current tier but can't change. Providers can still receive bookings that don't require upfront payment. |
| **Recovery** | Automatic once Stripe is back. Webhook events are retried by Stripe for up to 3 days. No data loss. |
| **Mitigation in place** | Stripe webhooks have built-in retry. Our webhook handler is idempotent. Subscription status cached in our DB. |

### 5.4 Twilio Goes Down

| Aspect | Impact |
|---|---|
| **Severity** | **LOW — Silent failure** |
| **What breaks** | SMS notifications (booking reminders, confirmations, status changes). SMS opt-out/opt-in processing. |
| **What still works** | Everything else. Email notifications still send. In-app notifications still work. Push notifications still work. Bookings, payments, messaging — all unaffected. |
| **User experience** | Users simply don't receive SMS. They still get email and in-app notifications. No error is shown to users. |
| **Recovery** | Automatic. Next SMS attempt will succeed once Twilio is back. Missed SMS notifications are not retried (they're time-sensitive). |
| **Mitigation in place** | `sendNotification()` returns `false` on failure but doesn't throw. Multi-channel approach means SMS is never the only notification path. |

### 5.5 S3 Storage Goes Down

| Aspect | Impact |
|---|---|
| **Severity** | **LOW-MEDIUM — Upload operations blocked** |
| **What breaks** | New file uploads (profile photos, portfolio images, message attachments, verification documents). |
| **What still works** | Existing images still display (served via CDN, cached). All non-upload operations work. Messaging works (just can't attach files). Bookings, payments, search — all fine. |
| **User experience** | "Upload failed" error when trying to upload. Existing photos/images continue to display normally. |
| **Recovery** | Automatic once S3 is back. No data loss (failed uploads were never stored). |
| **Mitigation in place** | `storagePut()` throws on failure — caught by tRPC error handling and shown to user. Existing CDN URLs remain valid. |

### 5.6 Manus OAuth Goes Down

| Aspect | Impact |
|---|---|
| **Severity** | **MEDIUM — New logins blocked** |
| **What breaks** | New user login/signup. OAuth callback fails. |
| **What still works** | All existing sessions remain valid (JWT-based, no server-side session store). Logged-in users are completely unaffected until their JWT expires. All features work for authenticated users. |
| **User experience** | "Login" button leads to an error page. Users who are already logged in notice nothing. |
| **Recovery** | Automatic once OAuth service is back. No data loss. |
| **Mitigation in place** | JWT sessions are self-contained (no DB lookup needed to validate). Long session expiry means most users stay logged in. |

### 5.7 Individual tRPC Router Fails

| Aspect | Impact |
|---|---|
| **Severity** | **LOW — Isolated to one feature** |
| **What breaks** | Only the specific feature that router handles. E.g., if `reviewRouter` has a bug, only reviews break. |
| **What still works** | All other routers are independent. Bookings, messages, payments, search — everything else continues. |
| **User experience** | Error state on the specific page/component that uses the broken router. Other pages work normally. |
| **Recovery** | Fix the bug and deploy. Other features are unaffected during the outage. |
| **Mitigation in place** | Router isolation (22 separate routers). Each procedure has its own error handling. tRPC returns typed errors that the frontend can display gracefully. |

### 5.8 getDb() Connection Cache Bug (HISTORICAL — FIXED)

| Aspect | Impact |
|---|---|
| **Severity** | **CRITICAL — Was causing silent data loss** |
| **What broke** | After a transient DB connection error (ECONNRESET), `getDb()` cached `null` forever. All subsequent DB calls returned empty arrays/undefined instead of throwing errors. Browse showed "No categories." Search showed "No results." |
| **Root cause** | Original code: `if (_db) return _db;` — once `_db` was set to `null` on failure, it was never retried. |
| **Fix applied** | Added retry logic with 3-second throttle. Added `requireDb()` that throws instead of returning null. Added frontend error states with "Try Again" buttons. Added tRPC retry config (3 attempts, exponential backoff). |
| **Lesson** | Never cache failure states permanently. Always have a retry path. Frontend must distinguish "no data" from "error fetching data." |

### Blast Radius Summary Table

| Component | Severity | Scope | Auto-Recovery | Data Loss Risk |
|---|---|---|---|---|
| Database (TiDB) | CRITICAL | Platform-wide | Yes (3s retry) | None |
| SSE Manager | LOW | Real-time features only | Yes (auto-reconnect) | None |
| Stripe | MEDIUM | Payments only | Yes (webhook retry) | None |
| Twilio | LOW | SMS only | Yes (next attempt) | Missed SMS (acceptable) |
| S3 Storage | LOW-MEDIUM | Uploads only | Yes (next attempt) | None (failed uploads never stored) |
| Manus OAuth | MEDIUM | New logins only | Yes (automatic) | None |
| Single tRPC Router | LOW | One feature | Deploy fix | None |
| Express Server Crash | CRITICAL | Everything | Yes (process restart) | None (stateless) |

---

## 6. Data Flow Diagrams

### 6.1 Booking Lifecycle

```
Customer                    Platform                     Provider
────────                    ────────                     ────────
Browse/Search
     │
     ▼
View Service Detail
     │
     ▼
Select Date & Time ────────► Check Availability ◄─────── Availability Schedule
     │                       (conflict detection)         (weekly + overrides)
     ▼
Confirm Booking ───────────► Create Booking (status: pending)
     │                              │
     ▼                              ▼
Stripe Checkout ───────────► Create Checkout Session
     │                       (deposit or full amount)
     ▼                              │
Payment Completes ◄────────── Stripe Webhook ──────────► Notify Provider (SSE + Email + SMS)
     │                       (checkout.session.completed)
     │                              │
     │                              ▼
     │                       Update Booking → "confirmed"
     │                              │
     │                              ▼
     │                       24hr Reminder ─────────────► SMS + Email to both parties
     │                              │
     │                              ▼
     │                       Provider marks "in_progress"
     │                              │
     │                              ▼
     │                       Provider marks "completed" ──► Review reminder (48hr)
     │                              │                      Referral credit fulfillment
     │                              ▼
     ▼                       Customer leaves review
Done                         Provider responds to review
```

### 6.2 Message Flow

```
Sender                      Server                       Recipient
──────                      ──────                       ─────────
Type message
     │
     ▼
sendTyping mutation ───────► sseManager.pushTypingIndicator() ──► "User is typing..."
     │                       (debounced, 2s throttle)              (auto-clears 4s)
     ▼
Send message ──────────────► message.send procedure
                             1. Insert into messages table
                             2. sseManager.pushMessageNotification() ──► Toast + badge
                             3. createNotification() (in-app)
                             4. sendNotification() (email/SMS if enabled)
                             5. Return message data
     │
     ▼
Message appears in chat     ◄──────────────────────────── Message appears in chat
(optimistic update)                                       (SSE push → refetch)
     │
     ▼
Recipient reads ────────────────────────────────────────► markAsRead mutation
                                                          1. Update readAt timestamp
                                                          2. sseManager.pushReadReceipt()
     │
     ▼
Double checkmark appears ◄── readReceipt SSE event ◄──── Read receipt sent
```

### 6.3 Authentication Flow

```
Browser                     Server                       Manus OAuth
───────                     ──────                       ──────────
Click "Login"
     │
     ▼
Redirect to Manus OAuth ──────────────────────────────► Login page
(state = origin + returnPath)                           User enters credentials
     │                                                        │
     │                                                        ▼
     │                                                  Redirect to /api/oauth/callback
     │                                                  (with ?code=xxx&state=yyy)
     │                      │
     │                      ▼
     │               parseState() → extract origin
     │               Exchange code for tokens
     │               Fetch user profile from OAuth
     │               upsertUser() → create/update in DB
     │               Sign JWT → set httpOnly cookie
     │               Redirect to origin + returnPath
     │                      │
     ▼                      ▼
Arrive at app with cookie
     │
     ▼
trpc.auth.me.useQuery() ──► createContext() → sdk.authenticateRequest()
     │                       → Verify JWT cookie
     │                       → Return user object
     ▼
App renders authenticated state
(NavHeader shows user name, provider dashboard accessible, etc.)
```

---

## 7. Database Architecture

### Schema Organization (28 Tables)

The database is organized into logical domains:

**Core Identity:**
- `users` — All platform users (customers, providers, admins)
- `service_providers` — Provider business profiles (1:1 with users who are providers)

**Service Catalog:**
- `service_categories` — 42 predefined categories (Barber, DJ, Handyman, etc.)
- `provider_categories` — Many-to-many: which providers serve which categories
- `services` — Individual service offerings with pricing
- `service_photos` — Photos attached to services (S3 URLs)
- `service_packages` — Bundled service packages with discount pricing
- `package_items` — Individual items within a package

**Booking & Scheduling:**
- `bookings` — All bookings (single, multi-day, recurring)
- `booking_sessions` — Individual sessions within multi-day/recurring bookings
- `availability_schedules` — Weekly recurring availability (Mon-Sun, start/end times)
- `availability_overrides` — Date-specific overrides (blocked days, special hours)
- `payments` — Payment records linked to bookings
- `quote_requests` — Customer requests for custom quotes

**Communication:**
- `messages` — All messages between users (threaded by conversationId)
- `notifications` — In-app notification records
- `notification_preferences` — Per-user channel preferences (email, SMS, push)
- `push_subscriptions` — Web push notification subscriptions

**Reviews & Trust:**
- `reviews` — Customer reviews of completed bookings
- `verification_documents` — Provider identity/license/insurance uploads

**Subscriptions & Billing:**
- `provider_subscriptions` — Provider tier subscriptions (Free/Basic/Premium)
- `customer_subscriptions` — Customer tier subscriptions (Free/Pro/Business)
- `promo_codes` — Provider discount codes
- `promo_redemptions` — Tracking which codes were used

**Referral Program:**
- `referral_codes` — Unique referral codes per user
- `referrals` — Referral tracking (who referred whom)
- `referral_credits` — Credit balance (earned/spent/expired)

**Other:**
- `customer_favorites` — Saved/favorited providers
- `saved_provider_folders` — Organizational folders for saved providers
- `contact_submissions` — Help center contact form submissions
- `portfolio_items` — Provider work samples/gallery

### Key Relationships

```
users (1) ──── (1) service_providers
users (1) ──── (N) bookings (as customer)
service_providers (1) ──── (N) services
service_providers (1) ──── (N) bookings (as provider)
services (1) ──── (N) bookings
bookings (1) ──── (N) messages (via conversationId)
bookings (1) ──── (1) reviews
bookings (1) ──── (N) payments
bookings (1) ──── (N) booking_sessions
service_categories (1) ──── (N) services
service_providers (N) ──── (N) service_categories (via provider_categories)
```

### Why TiDB?

TiDB is MySQL wire-compatible, meaning Drizzle's `mysql2` driver works without modification. It provides managed cloud hosting with automatic backups, horizontal scalability if the platform grows beyond a single node, and ACID transactions for booking/payment operations where consistency is critical.

---

## 8. Authentication & Authorization

### Three-Layer Auth Model

```
Layer 1: OAuth (External)
├── Manus OAuth handles login/signup
├── Returns JWT token set as httpOnly cookie
└── No passwords stored in our system

Layer 2: JWT Validation (Per-Request)
├── sdk.authenticateRequest(req) in createContext()
├── Validates JWT signature and expiry
├── Returns User object or null
└── No database lookup needed (self-contained token)

Layer 3: Procedure Guards (Per-Endpoint)
├── publicProcedure — anyone can call (no auth required)
├── protectedProcedure — must be logged in (ctx.user exists)
└── adminProcedure — must be admin role (ctx.user.role === 'admin')
```

### Role System

| Role | Access Level | How Assigned |
|---|---|---|
| `customer` | Browse, book, message, review | Default on signup |
| `provider` | All customer features + provider dashboard, services, availability | Set when user completes provider onboarding |
| `admin` | All features + admin dashboard, user management, moderation | Set manually in database |

### Post-Signup Role Selection

New users see a role selection screen (`/select-role`) before accessing the platform. This sets their initial intent (customer vs. provider) and routes them appropriately. The `hasSelectedRole` flag on the user record tracks whether they've completed this step. The `RoleGuard` component in the React app redirects users who haven't selected a role.

---

## 9. Real-Time System (SSE)

### Architecture

The SSE system is a **singleton** (`sseManager`) that maintains an in-memory map of connected clients:

```typescript
// Map<clientId, { userId, res (Express Response), connectedAt }>
private clients: Map<string, SSEClient> = new Map();
```

Each user can have multiple connections (multiple browser tabs). Events are sent to ALL connections for a given userId.

### Event Types

| Event | Trigger | Data | Consumer |
|---|---|---|---|
| `connected` | Client connects | `{ clientId }` | useSSE hook (resets reconnect counter) |
| `notification` | Any in-app notification created | Full notification object | NotificationDropdown |
| `unreadCount` | Notification read/created | `{ count }` | Badge in NavHeader |
| `newMessage` | Message sent | `{ conversationId, senderId, senderName, messagePreview }` | Conversations inbox |
| `typing` | User typing in chat | `{ conversationId, senderId, senderName, isTyping }` | Messages page |
| `readReceipt` | Messages marked as read | `{ conversationId, readBy, readAt }` | Messages page (checkmarks) |

### Why Singleton?

The SSE manager must be a singleton because it holds the live HTTP response objects. If you created multiple instances, events would only reach clients connected to that specific instance. In a multi-process deployment, you'd need Redis pub/sub — but for our single-process Node.js server, a singleton is correct and simple.

### Connection Lifecycle

1. Client opens `EventSource("/api/sse/notifications")` with credentials
2. Server authenticates via JWT cookie
3. Server calls `sseManager.addClient(userId, res)` — stores the Response object
4. Server sends `event: connected` with a unique clientId
5. Every 30 seconds, server sends `:heartbeat\n\n` (SSE comment, keeps connection alive)
6. When client disconnects, `res.on("close")` fires → `removeClient(clientId)`
7. Client-side: on error/disconnect, exponential backoff reconnect (1s → 2s → 4s → ... → 30s)

---

## 10. Payment System (Stripe)

### Revenue Model

- **Platform fee:** 1% of every booking transaction
- **Provider subscriptions:** Free ($0), Professional ($19.99/mo), Business ($49.99/mo)
- **Customer subscriptions:** Free ($0), Pro ($9.99/mo), Business ($19.99/mo)

### Payment Flow

```
1. Customer confirms booking
2. Server creates Stripe Checkout Session:
   - line_items: service price + platform fee
   - payment_intent_data.application_fee_amount: 1% fee
   - payment_intent_data.transfer_data.destination: provider's Stripe Connect account
3. Customer redirected to Stripe Checkout page
4. Customer pays → Stripe processes → webhook fires
5. Webhook handler (checkout.session.completed):
   - Updates booking status to "confirmed"
   - Creates payment record in our DB
   - Sends notifications to provider (SSE + email + SMS)
   - Sends confirmation to customer (email)
6. Money flows: Customer → Stripe → Platform (1% fee) + Provider (99%)
```

### Stripe Connect (Provider Payouts)

Providers connect their Stripe account during onboarding (Step 4). This creates a "destination charge" model where:
- Customer pays the platform
- Platform automatically transfers funds to provider (minus 1% fee)
- No manual payout triggers needed

### Webhook Security

The Stripe webhook endpoint (`/api/stripe/webhook`) is registered BEFORE `express.json()` middleware. This is critical because Stripe signature verification requires the raw request body. If `express.json()` parses it first, the signature check fails.

```typescript
// MUST be before express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
```

### Cancellation Refund Policy

| Time Before Appointment | Refund Percentage |
|---|---|
| 48+ hours | 100% |
| 24-48 hours | 75% |
| 4-24 hours | 50% |
| Less than 4 hours | 0% (no refund) |

---

## 11. Notification System

### Multi-Channel Architecture

```
server/notifications/
├── index.ts          ← NotificationService singleton + sendNotification()
├── types.ts          ← Notification, NotificationChannel, NotificationProvider interfaces
├── templates.ts      ← Email/SMS templates per notification type
├── providers/
│   ├── email.ts      ← Sends via Manus Forge API
│   ├── sms.ts        ← Sends via Twilio
│   └── push.ts       ← Sends via Web Push (VAPID)
└── pushHelper.ts     ← Helper for sending push to all user's subscriptions
```

### How It Works

```typescript
await sendNotification({
  type: 'booking_confirmed',
  channel: 'email',          // or 'sms' or 'push'
  recipient: { userId: 123, email: 'user@example.com' },
  data: { bookingNumber: 'BK-12345', serviceName: 'Haircut' }
});
```

The `NotificationService` finds the appropriate provider for the channel and delegates. Each provider handles its own API calls and error handling. Failures return `false` but never throw — notifications are fire-and-forget.

### Notification Preferences

Users can opt out of specific notification types per channel. The `notification_preferences` table stores these preferences. Before sending, the system checks if the user has opted out of that type+channel combination.

### SMS Compliance (TCPA/CTIA)

The platform handles SMS opt-out compliance via a Twilio webhook at `/api/twilio/sms`:
- **STOP/UNSUBSCRIBE/CANCEL/END/QUIT** → Opt user out of all SMS
- **START/SUBSCRIBE/YES/UNSTOP** → Opt user back in
- **HELP/INFO** → Reply with program information

---

## 12. File Storage (S3)

### How Files Are Stored

All file uploads go through `storagePut()` in `server/storage.ts`:

```typescript
const fileKey = `${userId}-files/${fileName}-${randomSuffix()}.png`;
const { url } = await storagePut(fileKey, fileBuffer, "image/png");
// url = CDN URL that's publicly accessible
```

The URL is then stored in the database (e.g., `profilePhotoUrl`, `attachmentUrl`, `imageUrl`). Files are never stored in the database itself — only references.

### File Types in the System

| Feature | File Key Pattern | Max Size |
|---|---|---|
| Profile photos | `{userId}-profile/{name}-{random}.{ext}` | 5MB |
| Service photos | `{userId}-services/{name}-{random}.{ext}` | 5MB |
| Portfolio items | `{userId}-portfolio/{name}-{random}.{ext}` | 10MB |
| Message attachments | `{userId}-messages/{name}-{random}.{ext}` | 10MB |
| Verification docs | `{userId}-verification/{name}-{random}.{ext}` | 10MB |

### Why Random Suffixes?

File keys include a random suffix to prevent URL enumeration. Without it, an attacker could guess file URLs by iterating user IDs and common filenames.

---

## 13. Background Jobs & Schedulers

Three background jobs run on server startup:

| Job | Interval | Purpose | What Happens If It Fails |
|---|---|---|---|
| **Reminder Service** | Every 15 minutes | Sends 24-hour booking reminders | Users don't get reminded. Bookings still happen. |
| **Review Reminder** | Every 30 minutes | Prompts customers to review completed bookings (48hr after) | Users don't get review prompts. Reviews still work manually. |
| **Credit Expiration** | Every 24 hours | Marks expired referral credits as 'expired' | Credits stay active longer than intended. Low impact. |

All three are started in `server/_core/index.ts` after the HTTP server begins listening. They use `setInterval` and query the database for records that need action. If the database is temporarily unavailable, they log an error and try again on the next interval.

---

## 14. Development Guidelines

### Adding a New Feature (Step by Step)

1. **Schema** — Add/modify tables in `drizzle/schema.ts`
2. **Migrate** — Run `pnpm db:push` to apply schema changes to TiDB
3. **DB Helpers** — Add query functions in `server/db/{domain}.ts` (new pattern) or `server/db-legacy.ts`
4. **Router** — Create `server/routers/{feature}Router.ts` (keep under ~150 lines)
5. **Register** — Import and add to `server/routers.ts`
6. **UI** — Create page in `client/src/pages/{Feature}.tsx`
7. **Route** — Register in `client/src/App.tsx`
8. **Tests** — Write Vitest specs in `server/{feature}.test.ts`
9. **Todo** — Mark as complete in `todo.md`

### Code Organization Rules

- **Router files:** Keep under ~150 lines. Split into `server/routers/{feature}Router.ts`.
- **DB helpers:** Pure data access. No business logic. Return raw Drizzle rows.
- **Business logic:** Lives in router procedures or dedicated service files.
- **Shared types:** Put in `shared/` directory (accessible by both client and server).
- **Components:** Reusable UI in `client/src/components/`. Page-specific UI in `client/src/pages/`.

### Procedure Types

```typescript
// Anyone can call (no login required)
publicProcedure.query(async ({ ctx }) => { ... })

// Must be logged in
protectedProcedure.mutation(async ({ ctx }) => {
  // ctx.user is guaranteed to exist
})

// Must be admin
adminProcedure.query(async ({ ctx }) => {
  // ctx.user.role === 'admin' guaranteed
})
```

### Error Handling Pattern

```typescript
// In router procedures:
const db = await requireDb(); // Throws if DB unavailable
// ... proceed with queries

// In frontend:
const { data, error, isLoading } = trpc.feature.useQuery();
if (error) return <ErrorState onRetry={() => refetch()} />;
if (isLoading) return <Skeleton />;
```

### Extending SSE Events

To add a new real-time event:

1. Add a push method to `server/sseManager.ts`:
```typescript
pushNewEvent(userId: number, data: { ... }): void {
  this.sendToUser(userId, "newEvent", data);
}
```

2. Call it from your router procedure after the DB write:
```typescript
sseManager.pushNewEvent(recipientUserId, { ... });
```

3. Add handler in `client/src/hooks/useSSE.ts`:
```typescript
onNewEvent?: SSEEventHandler;
// ... in the EventSource setup:
es.addEventListener("newEvent", (e) => { ... });
```

4. Consume in your component:
```typescript
useSSE({ onNewEvent: (data) => { /* update state */ } });
```

---

## 15. Testing Patterns

### Test Structure

Tests live alongside the code they test: `server/{feature}.test.ts`. The project uses Vitest with the following patterns:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("./db-legacy", () => ({
  getDb: vi.fn(() => mockDb),
  requireDb: vi.fn(() => mockDb),
}));

vi.mock("./notifications", () => ({
  sendNotification: vi.fn(() => Promise.resolve(true)),
}));

describe("featureRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a thing", async () => {
    // Arrange
    const input = { name: "Test" };
    const ctx = { user: { id: 1, role: "customer" } };

    // Act
    const result = await caller.feature.create(input);

    // Assert
    expect(result.name).toBe("Test");
  });
});
```

### What to Mock

- **Database** — Always mock. Tests should not hit a real database.
- **External services** — Mock Stripe, Twilio, S3, OAuth.
- **SSE Manager** — Mock `sseManager.sendToUser()` and verify it was called.
- **Notification Service** — Mock `sendNotification()` and verify calls.

### What NOT to Mock

- **Zod validation** — Let it run. Tests should verify input validation works.
- **Business logic** — The whole point is testing this.
- **tRPC procedure chain** — Use `createCallerFactory` to test the full procedure.

### Current Test Coverage

- **1004+ tests** across 51+ test files
- **3 known pre-existing failures** (timeout-related, acceptable)
- Focus: server-side logic, router procedures, DB helpers, webhook handlers

---

## 16. Known Gotchas & War Stories

### The Null-Caching Database Bug

**What happened:** After a transient database connection error (TCP ECONNRESET from TiDB), `getDb()` cached `null` as the database instance. Every subsequent call returned `null`. DB helper functions checked `if (!db) return []` — silently returning empty data instead of errors.

**Symptoms:** Browse page showed "No categories found." Search showed "No results." But no errors appeared in logs because the code treated "no DB" as "no data."

**Fix:** Three-part fix:
1. `getDb()` now retries after 3 seconds instead of caching null forever
2. `requireDb()` throws an error instead of returning null
3. Frontend shows error states with "Try Again" buttons (not empty states)

**Lesson:** Never treat infrastructure failure as "empty data." Always distinguish between "the query returned zero rows" and "the query couldn't execute."

### The Stripe Webhook Body Parsing Bug

**What happened:** If `express.json()` middleware runs before the Stripe webhook route, it parses the raw body into a JavaScript object. Stripe's signature verification needs the raw bytes. Signature check fails → webhook rejected → payments never confirm.

**Fix:** Register the webhook route with `express.raw()` BEFORE `express.json()`:
```typescript
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handler);
// ... later ...
app.use(express.json({ limit: "50mb" }));
```

### The Provider Role Bug

**What happened:** When a user completed provider onboarding, the `provider.create` mutation created the provider record but didn't update the user's `role` field from "customer" to "provider." The NavHeader checked `user.role === 'provider'` to show the dashboard link — so new providers couldn't access their dashboard.

**Fix:** Added `db.updateUserProfile(ctx.user.id, { role: "provider" })` to the provider creation mutation. Also added a fallback check in NavHeader: show dashboard if `user.role === 'provider'` OR if `getMyProfile` returns data.

### The Search Auto-Trigger Bug

**What happened:** The Search page used `refetchOnWindowFocus: true` (React Query default). Every time a user switched tabs and came back, it re-fired the search query — even with empty inputs. Combined with the DB caching bug, this made Search appear broken.

**Fix:** Disabled `refetchOnWindowFocus` globally in QueryClient config. Search only fires when the user explicitly enters a query or adjusts filters.

### The OG Tag CDN Override

**What happened:** Server-side injected OG meta tags were being overwritten by the Manus CDN's pre-rendering. Social media crawlers (Facebook, LinkedIn) saw generic platform metadata instead of provider-specific previews.

**Fix:** Created a dedicated `/api/og/:type/:id` route that serves minimal HTML with correct OG tags. This route bypasses the CDN entirely. Human visitors are instantly redirected to the real SPA page via `<meta http-equiv="refresh">`.

---

## 17. Glossary

| Term | Definition |
|---|---|
| **Procedure** | A tRPC endpoint (query or mutation). Equivalent to a REST API endpoint. |
| **Router** | A group of related procedures (e.g., `bookingRouter` has create, list, update, cancel). |
| **Protected Procedure** | A procedure that requires authentication. Throws UNAUTHORIZED if no user. |
| **Context (ctx)** | The object passed to every procedure containing `req`, `res`, and `user`. |
| **SSE** | Server-Sent Events. One-way real-time communication from server to browser. |
| **Blast Radius** | The scope of impact when a component fails. What breaks, what degrades, what's unaffected. |
| **Superjson** | Serialization library that preserves JavaScript types (Date, BigInt) across HTTP. |
| **Drizzle** | Type-safe ORM that generates SQL from TypeScript schema definitions. |
| **TiDB** | MySQL-compatible distributed database used in production. |
| **Forge API** | Manus platform API used for email sending and S3 storage proxy. |
| **VAPID** | Voluntary Application Server Identification — keys used for Web Push notifications. |
| **Stripe Connect** | Stripe's marketplace product that enables paying out to provider accounts. |
| **Destination Charge** | Stripe pattern where platform collects payment and automatically transfers to provider. |
| **Webhook** | HTTP callback from an external service (Stripe, Twilio) notifying us of events. |
| **Optimistic Update** | UI updates immediately before server confirms, rolls back on error. |
| **Invalidate** | Tell React Query to refetch data from the server (discard cache). |

---

## File Map (Quick Reference)

```
/
├── client/src/
│   ├── App.tsx                    ← All routes defined here
│   ├── main.tsx                   ← tRPC + React Query providers
│   ├── pages/                     ← 38 page components
│   ├── components/                ← 19 reusable components
│   ├── hooks/                     ← 12 custom hooks (useSSE, useAuth, etc.)
│   └── contexts/                  ← ViewModeContext, AuthContext
│
├── server/
│   ├── _core/                     ← Framework plumbing (DO NOT EDIT unless extending infra)
│   │   ├── index.ts               ← Express server setup + middleware chain
│   │   ├── context.ts             ← tRPC context creation (auth)
│   │   ├── trpc.ts                ← Procedure definitions (public/protected/admin)
│   │   ├── oauth.ts               ← OAuth callback handler
│   │   ├── sdk.ts                 ← JWT verification
│   │   ├── env.ts                 ← Environment variable access
│   │   ├── llm.ts                 ← LLM integration helper
│   │   ├── notification.ts        ← Owner notification helper
│   │   └── vite.ts                ← Dev server + OG tag injection
│   │
│   ├── routers.ts                 ← Router aggregator (merges all 22 routers)
│   ├── routers/                   ← Feature routers (auth, booking, message, etc.)
│   ├── db-legacy.ts               ← Legacy DB helpers (~117 functions)
│   ├── db/                        ← Modular DB helpers (new pattern)
│   │   ├── connection.ts          ← DB connection with retry logic
│   │   ├── users.ts, services.ts, bookings.ts, etc.
│   │   └── index.ts              ← Barrel re-export
│   │
│   ├── sseManager.ts              ← Real-time event push (singleton)
│   ├── notifications/             ← Multi-channel notification service
│   ├── storage.ts                 ← S3 upload/download helpers
│   ├── stripeWebhook.ts           ← Stripe event handler
│   ├── stripeRouter.ts            ← Stripe checkout/subscription procedures
│   ├── stripeConnectRouter.ts     ← Provider payout procedures
│   ├── products.ts                ← Subscription tier definitions
│   ├── calendarFeed.ts            ← iCal feed generation
│   ├── reminderService.ts         ← 24hr booking reminders
│   ├── reviewReminderService.ts   ← Post-booking review prompts
│   └── jobs/creditExpiration.ts   ← Referral credit expiry scheduler
│
├── drizzle/
│   └── schema.ts                  ← All 28 database tables defined here
│
├── shared/
│   ├── const.ts                   ← Shared constants (tier names, error messages)
│   ├── duration.ts                ← Duration formatting utilities
│   ├── shareUrl.ts                ← Social sharing URL helpers
│   └── types.ts                   ← Shared TypeScript types
│
├── PLATFORM_DOCS.md               ← Feature inventory & API reference
├── DEVELOPER_GUIDE.md             ← This file (architecture & blast radius)
└── todo.md                        ← Feature tracking & history
```

---

> **Remember:** When in doubt, check how an existing similar feature was implemented. The codebase is consistent — patterns repeat. If you're adding a new router, look at `messageRouter.ts` as a reference. If you're adding a new notification type, look at how booking confirmations are sent. Consistency is more valuable than cleverness.

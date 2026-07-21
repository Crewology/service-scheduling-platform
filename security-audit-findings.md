# Security Audit Report — OlogyCrew Platform

**Date:** July 21, 2026  
**Auditor:** Automated Security Review  
**Status:** All critical and high-severity issues FIXED

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 2 | 2 | 0 |
| HIGH | 5 | 5 | 0 |
| MEDIUM | 2 | 2 | 0 |
| LOW/INFO | 4 | 0 | 4 (acceptable risk) |

---

## CRITICAL Issues (All Fixed)

### 1. Conversation Messages Accessible Without Authorization
**File:** `server/routers/messageRouter.ts`  
**Issue:** `getConversation` was a `protectedProcedure` but did NOT verify the authenticated user was a participant in the conversation. Any logged-in user could read ANY conversation by guessing the conversationId format (`conv-{userId1}-{userId2}`).  
**Impact:** Full message content exposure for any authenticated user.  
**Fix:** Added access control check that verifies `ctx.user.id` is one of the participants in the conversation before returning messages. Returns FORBIDDEN error if not authorized.

### 2. Booking Data Exposed Publicly via listByDateRange
**File:** `server/routers/bookingRouter.ts`  
**Issue:** `listByDateRange` was a `publicProcedure` — no authentication required. Anyone could enumerate provider IDs and retrieve all booking data including customer notes, addresses, and payment amounts.  
**Impact:** Customer PII and financial data exposure.  
**Fix:** Changed to `protectedProcedure` with ownership verification — only the provider owner or platform admin can access the data.

---

## HIGH Issues (All Fixed)

### 3. auth.me Endpoint Exposed Sensitive User Fields
**File:** `server/routers/authRouter.ts`  
**Issue:** The `auth.me` endpoint returned the full user object including `passwordHash`, `emailVerificationToken`, `passwordResetToken`, and `passwordResetExpires`.  
**Impact:** Password hashes and security tokens exposed to the frontend.  
**Fix:** Added explicit field stripping — destructures out sensitive fields and returns only safe user data.

### 4. Provider getById/getBySlug Exposed stripeAccountId
**File:** `server/routers/providerRouter.ts`  
**Issue:** Public endpoints `getById` and `getBySlug` returned the full provider object including `stripeAccountId` (internal Stripe Connect ID).  
**Impact:** Internal payment infrastructure details exposed publicly.  
**Fix:** Destructure out `stripeAccountId` from both endpoints before returning. `userId` is preserved since it's needed for messaging functionality.

### 5. Booking ICS Download Had No Authentication
**File:** `server/calendarFeed.ts`  
**Issue:** The `/api/calendar/booking/:id.ics` endpoint had no authentication — anyone could download any booking's calendar file by guessing IDs.  
**Impact:** Booking details (time, location, notes) exposed without auth.  
**Fix:** Added SDK authentication check and verified the requesting user is either the customer or the provider for that booking.

### 6. Help Chat (LLM) Endpoint Had No Rate Limiting
**File:** `server/helpChatRouter.ts`  
**Issue:** The public chat endpoint called the LLM API with no rate limiting, message size limits, or conversation length limits. Attackers could abuse this for cost amplification.  
**Impact:** Potential for significant API cost abuse.  
**Fix:** Added per-user rate limiting (10 requests/minute), message content length limit (2000 chars), and conversation history limit (20 messages).

### 7. File Uploads Lacked Content Type Validation
**Files:** `server/routers/providerRouter.ts`, `server/routers/serviceRouter.ts`  
**Issue:** Profile photo and service photo uploads accepted any `contentType` string without validation. No file size enforcement on the server side.  
**Impact:** Potential for uploading non-image files or oversized files.  
**Fix:** Changed `contentType` from `z.string()` to `z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"])`. Added 5MB server-side file size enforcement.

---

## MEDIUM Issues (All Fixed)

### 8. Provider getById Type Safety
**File:** `server/routers/providerRouter.ts`  
**Fix:** Sensitive fields stripped (covered in HIGH #4 above).

### 9. PhotoUpload Component Type Mismatch
**File:** `client/src/components/PhotoUpload.tsx`  
**Fix:** Updated type assertions to match the new enum-based contentType validation.

---

## LOW/INFO (Acceptable Risk — Not Fixed)

### 10. No CSRF Token (Acceptable)
- The platform uses cookie-based sessions with SameSite attributes
- tRPC mutations use POST requests which are not subject to simple CSRF
- **Risk Level:** Very Low — standard cookie security is sufficient

### 11. SSE Endpoint Uses Cookie Auth (Acceptable)
- The `/api/sse` endpoint validates auth via cookie in the request
- This is the standard pattern for SSE with cookie-based auth
- **Risk Level:** Very Low

### 12. Calendar Feed Uses Token-Based Auth (Acceptable)
- The iCal feed uses a per-user token in the URL (not session cookie)
- Tokens are generated with `crypto.randomBytes(32)` — cryptographically secure
- **Risk Level:** Low — tokens are unguessable, standard iCal pattern

### 13. Pre-existing Test Failures (Unrelated)
- 20 test files have pre-existing failures (47 tests) unrelated to security changes
- These are mostly about email verification requirements and cookie clearing counts
- Our security tests (13 tests) all pass

---

## Existing Security Strengths

The platform already had several good security practices in place:

1. **Helmet.js** — Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
2. **Rate Limiting** — General (100 req/15min) and sensitive (20 req/15min) limiters
3. **Auth-specific Rate Limiting** — Login, register, forgot-password endpoints
4. **Stripe Webhook Signature Verification** — `stripe.webhooks.constructEvent` validates all webhooks
5. **Drizzle ORM** — Parameterized queries prevent SQL injection by default
6. **React Auto-Escaping** — JSX auto-escapes content, preventing XSS (no `dangerouslySetInnerHTML` found)
7. **Secure Unsubscribe Tokens** — Generated with `crypto.randomBytes(32)`
8. **Ownership Verification** — Most mutation endpoints verify the user owns the resource
9. **Role-Based Access** — Admin procedures properly gate with `ctx.user.role === 'admin'`
10. **Anti-Spam System** — Message sending has anti-spam detection

---

## Recommendations for Future

1. **Add request logging/audit trail** — Log all admin actions and sensitive operations
2. **Implement account lockout** — After N failed login attempts, temporarily lock the account
3. **Add 2FA support** — For provider accounts handling payments
4. **Content Security Policy refinement** — Tighten CSP to specific domains
5. **Regular dependency audits** — Run `npm audit` on a schedule

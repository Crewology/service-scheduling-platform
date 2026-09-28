# OlogyCrew Opportunity Matching Assessment

**Date:** September 28, 2026  
**Decision:** **Proceed only as a narrow, private “Invite Matching Providers” extension of the existing service marketplace. Do not build a separate Jobs & Labor marketplace yet.**

## Executive recommendation

The opportunity is real, but the uploaded proposal should be adapted to OlogyCrew rather than copied literally.

> The right first product is not a job board. It is a **customer service request that OlogyCrew matches to existing providers, followed by customer-approved invitations and the existing quote → booking → payment → review → Customers lifecycle.**

This gives OlogyCrew a differentiated matching workflow without introducing a second account type, a resume database, employment classification, payroll, a public job feed, or a parallel transaction system.

The safest first journey is:

```text
Customer service request
        ↓
Deterministic provider matches
        ↓
Customer reviews reasons and invites up to five providers
        ↓
Provider declines or submits a quote
        ↓
Customer accepts one or more quotes
        ↓
Existing atomic booking + Stripe payment + review + Customers projection
```

This is a **medium-sized product extension**, not a quick UI edit. OlogyCrew already has most of the difficult downstream infrastructure, but it is missing the neutral request, structured skills, private match/invitation state, provider opt-in, and match auditability needed to do this safely.

## What the competitive evidence actually validates

### Upwork validates conversational discovery and controlled handoff

Upwork’s April 2026 ChatGPT integration allows a business to describe work, discover relevant talent, and draft a job post in ChatGPT. The user then continues on Upwork for scoping, contracts, compliance, and payments. [Official source](https://www.upwork.com/press/releases/upworks-work-marketplace-comes-to-chatgpt)

Upwork’s MCP server goes further—talent search, job drafting, invitations, proposal review, offer preparation, and contract management—but retains two important boundaries:

1. Every write follows a **draft-confirm** pattern.
2. Binding offers and movement of money complete on Upwork.com. [Official source](https://www.upwork.com/ai/mcp)

That is consistent with OlogyCrew’s completed Agentic Discovery Stage 1: agents may discover services and prepare a short-lived review handoff, but they cannot autonomously create bookings, quotes, holds, payment methods, or payments.

### Indeed validates free participation plus paid acceleration

Indeed’s current employer model includes free posting and candidate management, with paid tiers adding greater visibility, matching, invitations, automation, fit summaries, and additional outreach. [Official source](https://www.indeed.com/hire/o/pricing)

The lesson for OlogyCrew is **not** to copy sponsored job advertising immediately. It is to keep the basic service-request transaction accessible and monetize reach, workflow efficiency, analytics, or completed transactions only after real usage proves demand.

### Stripe validates a future path, not an immediate shortcut

Stripe supports seller-side agentic commerce through UCP or ACP, but agent-side embedded commerce is still described as private preview. [Official source](https://docs.stripe.com/agentic-commerce)

OlogyCrew should therefore continue its current sequence:

1. Discovery
2. Prepared request/handoff
3. Human review and confirmation on OlogyCrew
4. Existing Stripe transaction
5. Full agent checkout only as a separately approved future integration

## OlogyCrew’s current readiness

| Existing foundation | Reuse | Important boundary |
| --- | --- | --- |
| Provider profiles | Use as the primary professional profile/resume | Do not introduce a separate worker identity in the pilot |
| Provider categories and active services | Required match eligibility | A category alone is not proof of a specific skill |
| Service descriptions, equipment, requirements, portfolio | Display as relevant work evidence | Unstructured text is not reliable enough for required-skill matching |
| Weekly availability, overrides, bookings, and booking sessions | Compute a date/time availability signal | “Appears available” is a snapshot, not a hold or guarantee |
| City, state, service radius, and service modes | Initial location and virtual-service filtering | Nationwide mileage matching needs stored coordinates and provider time zones first |
| Trust evidence, completed bookings, and verified reviews | Explain match context | Never label a provider “qualified” or “safe” merely because a score is high |
| Quote requests and `batchId` | Reuse the provider quote response and customer comparison experience | Do not create quote rows for every automatic match; that would pollute Customers and provider workflows |
| Atomic booking and quote conversion | Reuse unchanged after a quote is accepted | No parallel booking writer may be introduced |
| Stripe Connect, payments, invoices, transfers | Reuse unchanged | No new payment path or revenue split in the pilot |
| Messages and notifications | Use after a legitimate invitation/response relationship exists | Do not use generic messages for automated cold outreach |
| Customers relationship projection | Continue from authoritative quote/booking/payment/message/review sources | A match or unaccepted invitation is not yet a provider-owned customer relationship |
| Provider workspace “Needs Attention” | Add a compact invited-opportunity item | Do not add another tile launchpad or clutter the primary dashboard |
| Customer home | Add one request entry and request-status summary | Do not replace need-first search, upcoming bookings, or rebooking |
| Agentic Discovery Stage 1 | Later expose draft request and controlled invite tools | Preserve non-transactional agent boundaries until full checkout is separately approved |
| Lifecycle-aware entitlements | Add future capability keys only after product validation | Do not hard-code plan access or change public pricing in the pilot |

## Current supply reality

A read-only real-provider liquidity check found:

| Pilot candidate | Active real providers | Active services | Assessment |
| --- | ---: | ---: | --- |
| Audio Visual Crew | 4 | 7 | Best first pilot; matches the uploaded example and has the strongest current supply |
| Website Production | 3 | 3 | Suitable second pilot lane; virtual delivery reduces location complexity |
| DJ & Music Services | 2 | 3 | Too thin for automatic matching at public-launch scale |
| Accountants | 2 | 2 | Too thin and more sensitive; not recommended for the first pilot |
| Virtual Assistant | 2 | 1 | Too thin for a credible match-selection experience |
| Remaining populated categories | Mostly 1 | Mostly 0–3 | Discovery should continue, but not opportunity matching yet |

This is enough for a **controlled Audio Visual Crew pilot**, then Website Production. It is not enough for a broad “18 providers match” public promise.

Recommended launch rule:

> A category is eligible for opportunity matching only when at least **three active, non-demo, opted-in providers** have an active service in that category.

## Recommended Release 1 product

### User-facing name

Use **Service Requests** or **Find Matching Providers** in customer-facing UI.

Use **Opportunities** in the provider workspace.

Avoid “Jobs,” “Workers,” “Employment,” and “Applicants” in Release 1. Those terms imply a labor marketplace, employment relationships, and capabilities OlogyCrew is not yet building.

### Customer flow

1. Customer selects **Find matching providers** from the need-first home or a quote-request entry point.
2. A short wizard collects:
   - Category
   - Plain-language need
   - Required and preferred skill tags
   - Preferred date/time or date range
   - Mobile, fixed-location, or virtual mode
   - City/state or virtual
   - Budget type and optional range
   - Quantity or coverage needed
   - Optional attachments
3. Customer reviews the exact request before publishing.
4. OlogyCrew returns eligible providers with plain-language match reasons.
5. Customer selects up to five providers and confirms **Invite providers**.
6. Customer sees request status: invited, viewed, declined, quote received, accepted, filled, closed, or expired.
7. Provider quotes appear in the existing quote comparison/review flow.
8. The customer may accept one or more quotes until the required coverage is filled.

### Provider flow

1. Provider explicitly enables **Receive matching opportunities** and chooses eligible categories, locations, modes, and channels.
2. A private invitation appears under **Needs Attention** and on `/provider/opportunities`.
3. The invitation shows:
   - Customer request summary
   - Date/time and location area
   - Requested skill tags
   - Budget only if the customer chose to disclose it
   - Why the provider matched
   - Availability note: “appears open,” “schedule not configured,” or “possible conflict”
4. Provider chooses:
   - **Decline**
   - **Submit quote** using one of their active services, proposed rate, fulfillment quantity, duration, and optional message
5. Submitting a quote creates the existing authoritative quote record and only then creates the normal provider-owned lead/relationship projection.
6. If accepted, the existing atomic quote-to-booking path continues unchanged.

### The provider profile remains the resume

Release 1 should display:

- Business/profile identity
- Relevant active service
- Category-specific skill tags
- Matching portfolio items
- Evidence the provider chose to submit and OlogyCrew actually reviewed
- Completed OlogyCrew bookings
- Booking-linked reviews
- Service modes and location
- Availability signal
- Proposed rate and fulfillment quantity
- Optional provider message

Resume upload should remain optional and outside the first pilot. It should never replace the structured profile.

## Matching model

### Start deterministic, not generative

Do not use an LLM to rank providers in Release 1. Use a versioned, testable rules engine. AI may later help translate a customer’s description into suggested skill tags, but the customer must review those tags before the request is published.

### Hard eligibility filters

A provider is eligible only when all required conditions pass:

- Active provider and live user account
- Not the official demo profile
- Provider has opted into opportunities
- Active provider-category membership
- At least one active service in the requested category
- Compatible service mode
- Compatible city/state or virtual mode
- Not the requesting customer’s own provider profile
- Not previously declined, blocked, or already invited for the same request
- Category is enabled for the controlled pilot

### Ranked factors

A transparent initial score can use:

| Factor | Proposed weight | Explanation shown to user |
| --- | ---: | --- |
| Category and active service | Required | “Offers Audio Visual Crew services” |
| Required/preferred skill tag coverage | 0–30 | “Profile lists Dante and live events” |
| Service mode | 0–15 | “Offers mobile service” |
| Location compatibility | 0–15 | “Serves Atlanta” |
| Date/time availability signal | 0–15 | “Appears open at the requested time” |
| Relevant booking-linked history | 0–10 | “Completed OlogyCrew bookings in this category” |
| Reviewed evidence relevant to the request | 0–10 | “Professional license evidence reviewed” |
| Profile completeness | 0–5 | “Service, portfolio, and availability are complete” |

Store a `matchVersion` and reason codes with each snapshot. Never expose a mysterious score without reasons.

### Truthful language

Use:

- “Matches 3 of 4 requested skills”
- “Appears available based on the current OlogyCrew calendar”
- “Insurance evidence reviewed through [date]”
- “Completed 8 OlogyCrew bookings”

Do not use:

- “Fully qualified”
- “Guaranteed available”
- “Safe”
- “Background checked” unless the specific reviewed evidence is current and the existing disclaimer is shown
- “Best provider”

## Required additive data model

### 1. `skill_tags`

A small owner-managed, category-scoped vocabulary.

Key fields:

- `id`
- `categoryId`
- `slug`
- `label`
- `isActive`
- `sortOrder`

Start only with tags for Audio Visual Crew and Website Production. Do not create an uncontrolled global skills taxonomy.

### 2. `service_skill_tags`

Links an active service to provider-declared skill tags.

Key fields:

- `serviceId`
- `skillTagId`
- `source` (`provider` initially)
- `createdAt`
- Unique `(serviceId, skillTagId)`

These are self-declared profile statements unless separately supported by an existing reviewed-evidence record.

### 3. `opportunity_requests`

Customer-owned service request.

Key fields:

- `id`
- `requestNumber`
- `customerId`
- `categoryId`
- `title`
- `description`
- `locationType`
- `city`, `state`, `postalCode` or private full location
- `preferredDate`, `preferredStartTime`, `preferredEndTime`
- `budgetType` (`fixed`, `hourly`, `daily`, `open`)
- `budgetMin`, `budgetMax`, `currency`
- `quantityNeeded`
- `visibility` fixed to `private_matches` in Release 1
- `status` (`draft`, `matching`, `open`, `partially_filled`, `filled`, `closed`, `expired`, `cancelled`)
- `expiresAt`
- `createdAt`, `updatedAt`

Do not store a full street address in match cards. Reveal only what is necessary for the invited provider to evaluate the work.

### 4. `opportunity_required_skills`

- `opportunityId`
- `skillTagId`
- `importance` (`required`, `preferred`)
- Unique `(opportunityId, skillTagId)`

### 5. `opportunity_matches`

One private, auditable row per request/provider candidate.

Key fields:

- `id`
- `opportunityId`
- `providerId`
- `serviceId`
- `matchVersion`
- `score`
- `eligibilityState`
- `reasonCodes` JSON
- `invitationStatus` (`suggested`, `invited`, `viewed`, `declined`, `quoted`, `selected`, `expired`)
- `quantityCanFulfill`
- `quoteRequestId` nullable
- `invitedAt`, `viewedAt`, `respondedAt`, `expiresAt`
- Unique `(opportunityId, providerId)`

### 6. `opportunity_events`

An append-only audit stream for publish, match, invite, view, decline, quote, selection, fill, close, expiration, and admin moderation events. Use idempotency keys so retries do not duplicate notifications or quotes.

### Existing tables to extend minimally

- `quote_requests.opportunityRequestId` nullable
- `notification_preferences.opportunityInvitesEnabled`
- `notification_preferences.opportunityInviteEmail`
- `service_providers.opportunityOptIn` may be separate preferences instead of profile state
- Optional per-category provider opportunity preferences in a dedicated table

No existing booking, payment, invoice, review, Stripe, partner-transfer, or Customers tables need to be replaced.

## Transaction and relationship boundaries

This is the most important non-breaking rule:

> Automatic matches and invitations must **not** create quote requests, messages, bookings, CRM contacts, or payments.

Only a provider’s deliberate **Submit quote** action should atomically:

1. Verify the invitation still belongs to that provider and remains open.
2. Recheck service/category/provider/account eligibility.
3. Recheck the request has not closed or filled.
4. Create one authoritative quote in `quoted` state linked to the opportunity.
5. Link the match to that quote.
6. Queue the existing quote projection into Customers.
7. Notify the customer once.

Customer quote acceptance then uses the existing guarded quote-to-booking transaction. This prevents duplicate sources of truth and keeps the Customers feature from filling with speculative automatic matches.

## API and module layout

Recommended files:

```text
shared/opportunities.ts                 enums, schemas, public labels
shared/opportunityEntitlements.ts       future capability keys only
server/opportunityMatching.ts           deterministic versioned ranking
server/db/opportunities.ts              raw database operations
server/routers/opportunityRouter.ts     tRPC ownership and lifecycle procedures
client/src/pages/CustomerOpportunities.tsx
client/src/pages/CustomerOpportunityCreate.tsx
client/src/pages/ProviderOpportunities.tsx
client/src/pages/OpportunityDetail.tsx
client/src/components/opportunities/*
```

Core tRPC procedures:

- `opportunity.createDraft`
- `opportunity.updateDraft`
- `opportunity.publish`
- `opportunity.listMine`
- `opportunity.getCustomerDetail`
- `opportunity.refreshMatches`
- `opportunity.inviteProviders`
- `opportunity.listProviderInvitations`
- `opportunity.getProviderInvitation`
- `opportunity.markViewed`
- `opportunity.decline`
- `opportunity.submitQuote`
- `opportunity.close`

Every procedure must derive the user from `ctx.user`, enforce ownership server-side, and avoid trusting provider/customer IDs supplied by the browser.

## UX placement without adding clutter

### Customer

- Add **Find matching providers** beside the existing need-first search or as a fallback when a search does not identify one clear service.
- Add a small **Your service requests** section to the customer home only when the customer has an active request.
- Reuse the existing quote review destination after provider responses arrive.

### Provider

- Add **Opportunity invitation** items to the existing **Needs Attention** list.
- Add `/provider/opportunities` under **More**, not as another primary dashboard tile.
- Show an unread count only when an actual invitation exists.

### Admin

Aggregate oversight only:

- Requests created/open/filled/expired
- Eligible matches per request
- Invitations sent/viewed/declined
- Quotes received and conversion to booking
- Match generation failures and lag
- Provider opt-in and category liquidity
- Reports/blocks/abuse signals

Admin should not receive routine access to private proposal text or use the feature as provider/customer surveillance.

## Feature flags and rollout controls

Use additive flags with safe defaults:

- `opportunityMatchingEnabled = false`
- `opportunityPilotCategoryIds = [15]`
- `opportunityPilotCustomerIds = []`
- `opportunityPilotProviderIds = []`
- `opportunityMaxInvitesPerRequest = 5`
- `opportunityMatchVersion = 1`

Deploy the schema and code dark. Enable only named owner-controlled pilot accounts. Rollback is one flag change; existing service, quote, booking, CRM, and payment behavior remains untouched.

## Recommended phases

### Phase 0 — Read-only design and hardening

- Finalize “service request / independent provider” legal and product language.
- Audit existing bulk quote provider validation, batch filtering, idempotency, and notification behavior.
- Define pilot skill tags and match reasons.
- Add schema and feature flags with no UI exposure.
- Add deterministic match dry-run for Audio Visual Crew.

### Phase 1 — Private Invite Matching Providers pilot

- Audio Visual Crew only.
- Named pilot customers and at least three opted-in providers.
- Customer request wizard.
- Private match preview.
- Customer-selected invitations, maximum five.
- Provider Needs Attention entry and quote response.
- Existing quote acceptance, booking, payment, review, and Customers lifecycle.
- No open feed and no provider self-application.

### Phase 2 — Second category and provider-initiated interest

- Add Website Production after Phase 1 quality gates pass.
- Add a private eligible-opportunity feed for opted-in providers.
- Allow **Express interest / Submit quote** only when eligibility passes.
- Add request comparison and fill tracking.
- Add abuse controls and provider mute/block preferences.

### Phase 3 — Paid acceleration, only after usage evidence

Do not change current pricing or public plan copy during the pilot. After conversion data exists, consider:

- More simultaneous requests
- More invitations per request
- Advanced comparison and saved shortlists
- Request analytics
- Urgent/featured request placement with clear sponsorship labels
- Faster alert channels
- Team/customer coordination tools

Do not sell misleading “better match” rankings. Paid placement must be labeled and must never override hard eligibility or safety filters.

### Phase 4 — Agentic request and invite tools

Extend the existing agent contract using draft-confirm semantics:

- Draft a service request from a conversation
- Show customer-reviewable structured fields
- Search private eligible matches for an authenticated customer
- Prepare, but do not send, provider invitations
- Draft a provider quote
- Hand the user back to OlogyCrew to publish, invite, accept, book, or pay

Full agent checkout remains separate and requires explicit approval, Stripe protocol selection, payment/consent design, and end-to-end transaction testing.

## Explicitly do not build now

- A second worker or employer account type
- A public general job board
- A broad Jobs & Labor taxonomy
- Public resumes or a resume database
- Payroll, W-2 hiring, timekeeping, benefits, or employment classification
- Automated hiring decisions
- Automated provider invitations without customer review
- Autonomous offers, bookings, contracts, or payments
- Public opportunity URLs, sitemap entries, or agent feeds in Release 1
- Unsolicited bulk messages through the general message router
- AI-generated match scores with no deterministic explanation
- A separate opportunity payment or booking table
- Changes to Stripe Connect, the 60/40 partner revenue split, public plan prices, or current entitlements
- Healthcare, dental, legal, financial-advisor, day-labor, or other sensitive-category matching in the first pilot
- In-process timers or cron jobs inside the autoscaling server

## Required test matrix

Before the pilot is called complete, test:

### Authorization and privacy

- Customer can access only their own requests and matches
- Provider can access only invitations addressed to their provider profile
- Admin aggregate oversight does not expose private proposal content by default
- No customer/provider contact data leaks before a legitimate response relationship
- Demo, deleted, inactive, reserved test, and self-provider identities are excluded
- Full street address is not exposed in match cards

### Matching

- Category, service, skill, mode, location, and opt-in hard filters
- Deterministic ranking and stable `matchVersion`
- Required versus preferred tag behavior
- Availability snapshots and conflict rechecks
- No duplicate provider match or invitation
- Category liquidity gate
- Provider capacity/partial coverage behavior
- Honest reason labels and trust disclaimers

### Lifecycle and writes

- Draft, publish, close, cancel, expire, and fill state transitions
- Invite cap and idempotent retries
- Provider view/decline/quote lifecycle
- Exactly one quote per provider/request
- No CRM contact before provider quote submission
- Quote projection after legitimate quote submission
- Existing atomic quote acceptance and booking creation
- Multiple provider quotes may fulfill one request without overfilling it
- Closing/filling a request prevents new quotes

### Notifications and abuse

- Provider opportunity opt-in and channel preferences
- One notification per lifecycle event
- No email/SMS/push when disallowed
- Rate limits, cooldowns, block/mute, and report flow
- No use of generic messaging for automatic invitations

### Regression

- Existing service search and public profiles
- Direct booking and adaptive quote paths
- Provider availability and calendar conflict rules
- Payments, invoices, refunds, Stripe Connect, and partner transfers
- Reviews and trust taxonomy
- Customers tenant isolation and projections
- Provider/customer subscription lifecycle
- Agentic Discovery Stage 1 non-transaction policy
- Admin real-data scope and demo exclusion
- Desktop and mobile UX
- Full OlogyCrew regression suite, TypeScript, diff check, production build, and runtime logs

## Proposed pilot success gates

Treat these as decision thresholds, not marketing claims:

- At least 3 opted-in active providers in the category
- Median of at least 3 eligible matches per published pilot request
- Zero unauthorized request or proposal reads
- Zero duplicate invitations, quotes, bookings, or notifications
- At least 50% of invitations viewed within 48 hours during the controlled pilot
- At least 20% of invitations produce a decline reason or quote, proving providers engage rather than ignore the workflow
- At least one full request → quote → booking lifecycle completed without manual database repair
- Provider/customer qualitative feedback says the flow is clearer than manually browsing and messaging providers

## Final decision

**Build this opportunity—but build the OlogyCrew version.**

The best next move is an **Audio Visual Crew private Invite Matching Providers pilot** that converts provider responses into the existing quote lifecycle. That is strategically valuable, compatible with the current focused marketplace, and architecturally safer than launching Jobs & Labor.

It gives OlogyCrew a clear differentiator:

> Customers do not have to know which provider to search for. They describe the service outcome they need, OlogyCrew explains the best eligible matches, and the customer stays in control of invitations, selection, booking, and payment.

No production behavior or pricing should change until the Phase 0 design, schema, feature flags, and dry-run match audit are reviewed and approved.

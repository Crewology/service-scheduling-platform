# OlogyCrew Product Audit Notes

## Public Positioning and Pricing

The homepage communicates a broad but coherent promise: OlogyCrew is a digital home where independent service providers can be discovered, present their services, schedule work, communicate, collect payment, and send invoices. The strongest positioning language is “Your Business. Your Customers. Your Money.” and “We provide the infrastructure. You own the relationship.”

The public homepage has a clear provider-oriented story, but the platform serves both providers and customers. The customer value proposition is present primarily through search and browsing rather than through a comparably strong narrative.

The pricing page separates provider and customer plans through “I Provide Services” and “I Book Services,” which is conceptually sound. However, each audience has three tiers, producing six total plans and two separate subscription systems. Customer paid plans target coordinators, planners, agencies, and production companies; this is a narrower business-customer segment than the general consumer messaging elsewhere.

There is a critical policy inconsistency on the provider pricing page. The page says all plans include secure payments and explicitly states in the FAQ that Starter providers can accept Stripe payments. The current backend Stripe Connect onboarding code instead blocks free providers. The product decision and implementation must be reconciled before marketing or onboarding can be considered reliable.

The provider pricing cards list unavailable features alongside included features. Without strong visual distinction, this creates long, dense cards and makes plan comparison harder. The customer cards do the same. The most important differences should be summarized first, with secondary comparisons moved into a compact comparison table.

The customer-plan labels Individual, Coordinator, and Manager are sensible for business buyers, but paid customer subscriptions may be premature unless the platform already has frequent bookers with clear demand for folders, bulk quotes, and analytics. The free customer booking experience remains the marketplace’s demand engine and should receive priority over monetizing customers.

The recurring install-app banner and assistant button compete with primary calls to action on public pages, especially on mobile and smaller desktop viewports. These should be delayed, minimized, or shown only after meaningful engagement.

## Customer Discovery Journey

The Browse page presents more than 48 categories as one large alphabetical grid. Alphabetical order is predictable, but it does not help a first-time customer distinguish popular, nearby, event-oriented, home, personal-care, professional, and virtual services. A smaller set of customer-oriented groupings plus “Popular near you” would reduce decision effort while preserving the complete directory.

Several categories overlap or describe delivery context rather than customer intent, such as Barber Mobile versus Barber Shop, In-Shop versus Mobile Auto services, Personal Trainer versus Fitness Classes, and Event Planning versus Experiences. These distinctions may be useful operationally, but exposing all of them at the top level makes the marketplace feel broader and more fragmented than it needs to be.

The Audio Visual Crew category page successfully groups providers with their services, prices, locations, and next availability. This is one of OlogyCrew’s strongest differentiators because customers can compare both the provider and specific bookable offers without navigating into every profile.

The results page still requires too much reading. Long service descriptions dominate the cards, provider trust signals are inconsistent, and the primary action alternates between “View Profile” and clicking an individual service. A clearer hierarchy would prioritize provider name, trust/verification, distance or service area, starting price, next availability, and one primary action such as “See services and availability.”

The official demo provider appears among real providers. Although labeled DEMO, it risks reducing marketplace trust in production. Demo supply should be hidden from ordinary discovery once sufficient real supply exists, or placed in a clearly separated “Try a demo booking” area.

The location filter is useful but the initial discovery path is category-first rather than need-first. The homepage search should become the main path, with category browsing as a secondary fallback. Search should understand customer language, location, date, and whether the service is mobile, at a shop, virtual, or event-based.

## Public Provider Page and Booking Entry

The provider page is a genuine standout. It combines a branded business profile, complete service catalog, portfolio, service area, availability entry point, quote request, messaging, and payment reassurance under a clean provider-specific URL. This is materially more useful than a directory listing or a standalone scheduling link.

The page currently repeats the service-selection experience twice: once under “All Services” and again inside the “Book a Service” sidebar. On providers with many services, this can feel redundant and makes the page appear denser. The sidebar should function as a compact sticky action summary rather than a second service catalog.

Three competing primary actions—Browse & Book, Request a Quote, and Message Provider—are presented together. The correct action depends on service pricing. Fixed-price services should lead with “Check availability” or “Book,” quote-based services should lead with “Request quote,” and messaging should remain secondary.

The Trusted label is useful but insufficiently explained. Trust would be stronger if the page distinguished identity verified, business verified, insured, licensed where applicable, completed bookings, response time, and verified customer reviews. A generic badge without evidence risks feeling promotional.

The service-detail page has a clear four-step booking panel and keeps the user on the provider context. It also dedicates substantial screen space to six payment/security questions before a customer has selected a date. These questions are valuable, but they should be collapsed into a concise trust strip or placed closer to payment rather than competing with the booking task.

The booking-type choice is powerful, especially for production and event services, but it adds complexity to every service. Booking modes should be configured by the provider and only relevant options should appear. Most customers should see the simplest applicable flow, not every capability the platform supports.

## Logged-In Customer Experience

The customer landing page contains twelve equal-weight tiles: Browse, Search, Featured, My Bookings, Messages, Saved, Waitlist, Referrals, Alerts, Reviews, Receipts & Invoices, and Plans. The breadth is impressive, but the grid does not distinguish frequent tasks from occasional account utilities. A new customer must decide among Browse, Search, and Featured before even beginning discovery, while Alerts, Reviews, Referrals, and Plans receive the same visual priority as bookings.

The customer home should emphasize three jobs: find a service, manage the next booking, and communicate with a provider. Saved providers and receipts can remain secondary. Notifications should surface contextually rather than requiring a dedicated launchpad tile.

The My Bookings page supports customer and provider modes, upcoming and past bookings, drafts, quotes, search, exports, bulk booking, monthly planning, messaging, cancellation, review submission, and demo cleanup. This is capable but dense. “Bulk Book,” “Planner,” CSV/PDF export, and demo administration are specialized tools that should not compete with the core booking list for ordinary customers.

The distinction between a quote, a booking draft, a confirmed booking, a recurring session, and a bulk booking is operationally necessary but should be simplified in the customer-facing vocabulary. A unified activity view organized by “Needs your action,” “Upcoming,” and “History” would reduce the need to understand internal object types.

Customer paid plans add provider folders, bulk quote requests, booking analytics, spend reports, and priority requests. These features are more suitable for coordinators, agencies, and repeat business buyers than typical consumers. The platform should explicitly identify this audience as “Teams” or “Business booking” rather than presenting the plans as the default next step for every customer.

## Provider Experience

The five-step provider setup—Plan, Profile, Categories, Services, Get Paid—is logically ordered and reflects the minimum information required to become bookable. Gating the provider landing page until the profile, category, and service steps are complete is appropriate; Stripe can remain optional until the provider wants to accept payment.

The onboarding code currently removes the Plan step for providers with an active paid plan, despite the broader product intention that the Plan step remain visible and reflect the current selection. Hiding and revealing steps based on state makes the wizard’s structure change beneath the user and contributes to the plan-selection problems experienced during testing. The five steps should remain stable, with completed steps visibly marked and editable.

The provider landing page contains fifteen equal-weight tiles, including Dashboard, Profile, Bookings, Services, Schedule, Messages, Analytics, Payouts, Boost, My Page, Invoices, Widgets, Reviews, Featured, and Plans. The provider dashboard then repeats many of these capabilities inside six tabs. This is the clearest source of product confusion: providers are offered both a launchpad and a dashboard for overlapping jobs without a clear distinction.

The dashboard’s six groups—Bookings, Services, Schedule, Finances, My Page, and More—are a sound information architecture. They are more coherent than the fifteen-tile landing page and should become the primary provider workspace. The landing page should be reduced to current priorities and shortcuts rather than acting as a second application menu.

Before providers reach dashboard tabs, the page shows multiple summary cards, a quick-tip banner, a trust-score widget, and an onboarding checklist. These are useful during setup, but they push time-sensitive work such as pending bookings and messages lower on the page. The dashboard should lead with “Needs attention,” today’s schedule, pending bookings, and unread messages. Trust-building guidance belongs in a secondary growth section.

The provider product currently combines marketplace presence, scheduling, CRM-like communication, payments, invoicing, marketing tools, widgets, promotions, referrals, reviews, analytics, portfolio, verification, and subscriptions. These capabilities are strategically related, but exposing all of them simultaneously makes the product feel larger than the core promise. Progressive disclosure is required: providers should first establish a page, add services, set availability, and handle bookings; growth and advanced tools should appear as the business matures.

There are serious pricing and enforcement inconsistencies. The public Starter card includes “Invoicing & receipts,” while the backend intentionally restricts invoicing to Pro and Business. The public FAQ also says Starter providers can accept Stripe payments, while Stripe Connect onboarding currently blocks free providers. These contradictions must be resolved as a product-policy decision and then reflected consistently in copy, backend authorization, onboarding, and upgrade prompts.

The transaction-fee model is not explained in terms of Stripe processing fees versus OlogyCrew’s platform fee. Providers need one concise, consistent explanation of what is charged, who pays each fee, when payouts arrive, and how refunds affect balances.

## Product-Focus Diagnosis

OlogyCrew is not inherently too broad because it supports many service categories. Category breadth is acceptable when every category uses the same core loop: create a business page, list an offer, show availability, receive a booking or quote, communicate, collect payment, and encourage rebooking. The risk comes from exposing too many secondary capabilities and navigation choices before users complete that core loop.

The current application has 72 route declarations, 65 page components, fifteen provider launchpad tiles, and twelve customer launchpad tiles. The platform therefore has the capability footprint of a mature suite while still needing to prove the simplest marketplace behaviors: dense local supply, fast customer matching, provider activation, booking conversion, and repeat usage.

The product should be framed as a provider-owned digital storefront and operating layer, not as a generic directory and not as an all-purpose business-management suite. Discovery is the acquisition layer; the provider page is the asset; booking or quote is the conversion; messaging and payments complete the transaction; reviews and rebooking create retention.

The core provider product should visibly prioritize Profile, Services, Availability, Bookings, Messages, Payments, and Reviews. Portfolio, invoices, widgets, analytics, promotions, referrals, verification, and subscription management are valuable but should appear progressively or under grouped secondary navigation.

The core customer product should visibly prioritize Search, Compare, Book or Request Quote, Message, Pay, and Rebook. Saved providers and receipts support retention. Waitlists, planning, bulk booking, exports, referrals, analytics, and paid customer plans should be presented only to the segments that need them.

The most serious product risk is not missing functionality; it is inconsistency and reliability. Pricing promises, feature gates, trial behavior, downgrade behavior, onboarding state, and payment outcomes must agree across marketing, UI, backend authorization, notifications, and Stripe. A smaller reliable surface will create more trust than a larger surface with conflicting rules.

The strongest differentiation is the provider-owned OlogyCrew URL that combines identity, complete services, availability, quote or booking, messaging, payment, portfolio, and reputation in one place without selling leads or hiding the customer relationship. This should be the center of all messaging and product decisions.

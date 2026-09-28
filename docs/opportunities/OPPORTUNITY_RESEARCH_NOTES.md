# Opportunity Matching Research Notes

**Date:** September 28, 2026  
**Purpose:** Validate the uploaded opportunity-matching proposal before recommending any OlogyCrew implementation.

## Verified external signals

### Upwork + ChatGPT
Source: [Upwork's Work Marketplace Comes to ChatGPT](https://www.upwork.com/press/releases/upworks-work-marketplace-comes-to-chatgpt), April 9, 2026.

- Businesses can describe a project, discover relevant talent, and draft a job post in ChatGPT.
- Users are then guided into Upwork for project scoping, contracts, compliance, and payments.
- The launch therefore validates conversational discovery and draft creation, not invisible or irreversible hiring inside the assistant.

### Upwork MCP
Source: [Upwork MCP Server](https://www.upwork.com/ai/mcp), reviewed September 28, 2026.

- Clients can search and compare talent by skill, category, rate, or location; draft and manage job posts; invite freelancers; review proposals; prepare offers; and manage contract-related work.
- Freelancers can search jobs, review matches, draft proposals, respond to invitations, and manage work.
- OAuth 2.1 protects account access.
- Every write action follows a draft-confirm pattern.
- Binding offers, escrow funding, milestone payments, and other financial actions finish on Upwork.com.
- This reinforces the safety model already used by OlogyCrew Stage 1: agent discovery and prepared handoff first, customer confirmation on-platform for binding actions.

### Indeed employer model
Source: [Indeed Pricing](https://www.indeed.com/hire/o/pricing), reviewed September 28, 2026.

- Free posting includes search visibility, candidate management, direct application, screening questions, analytics, and message templates, subject to limits and quality rules.
- Paid Standard adds visibility, email/feed promotion, and automated application-state messages.
- Paid Premium adds higher placement, advanced matching, matched-candidate invitations, urgent labels, branding, and SMS.
- Premium Plus adds automated invitations, fit scores/summaries, credential gathering, and AI follow-up questions.
- The reusable lesson is a free workflow foundation plus paid reach, matching, automation, and analytics—not charging for basic participation.

### Stripe agentic commerce
Source: [Stripe Agentic Commerce](https://docs.stripe.com/agentic-commerce), reviewed September 28, 2026.

- Seller integrations can expose catalogs and support agent-completed checkout using UCP or ACP.
- Agent-side embedded commerce is still described as private preview.
- Stripe distinguishes catalog/discovery, checkout, payment credentials, and customer-controlled agent wallets.
- OlogyCrew should not jump directly from discovery to autonomous booking/payment. Opportunity matching should first reuse the existing user-reviewed handoff, while full agent checkout remains a separately gated future transaction project.

## Preliminary interpretation for OlogyCrew

The uploaded proposal identifies a real market direction, but copying a broad employment marketplace would conflict with OlogyCrew's approved focus. The safe opportunity is a bounded **customer work request to existing OlogyCrew service providers**:

1. A customer describes a service need.
2. OlogyCrew matches active providers using existing categories, services, service modes, location, trust evidence, and availability.
3. Providers may receive a private invitation and choose whether to respond.
4. The response becomes an existing quote request or a direct-booking review path.
5. Accepted work continues through the existing booking, Stripe, notification, review, and Customers relationship systems.

This is an extension of the current service marketplace, not a new employment, staffing, or worker marketplace.

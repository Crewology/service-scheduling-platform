# Customers Private Pilot Monitoring and Rollout Checklist

## Purpose

This owner guide defines how to interpret the Customers Pilot workspace and how to pause or evaluate the private pilot without changing authoritative booking, quote, payment, invoice, message, or review records.[1] [2]

## Current decision

The current overall status is **Live test deferred**. Automated consent, authorization, exactly-once delivery, projection, entitlement, deletion, and isolation tests pass, but no qualified customer has completed the real opt-in and one-message exercise. The pilot should remain limited to Chisolm Audio until that test is completed.[1]

## Expansion gate

Do not add another provider unless every integrity, entitlement, projection, sent-link, and future-capability check is Ready; the live customer check is completed rather than deferred; the candidate provider is active and retains the required lifecycle entitlement; no self-contact or orphaned relationship is present; and the owner intentionally updates the private allowlist through the audited configuration path. The monitoring screen never expands access automatically.[1] [3]

| Required condition | Expected state before expansion |
|---|---|
| Current pilot provider | Active and entitled |
| Tenant integrity | 0 self-contacts, non-pilot contacts, and scoped-child mismatches |
| Projection health | 0 missing, stale, never-projected, or lagging relationships |
| Sent-message integrity | 0 sent-draft linkage issues |
| Future capabilities | Repair jobs and recommendations off; 0 enabled rules, runs, and saved segments |
| Customer test | Completed by the customer through their own account |
| Owner action | Explicit, audited, and reversible |

## Safe disable order

If a privacy, consent, entitlement, message-link, or tenant-integrity check becomes Blocked, stop confirmed draft sending first. If the issue affects provider-authored records, stop provider writes next. Hide the provider read UI if relationships should no longer be visible, and stop projection writes last if source projection itself must be paused. Disabling Customers does not delete authoritative records or provider-authored retained data.[1] [3]

## Privacy rule

The monitoring workspace is not an admin surveillance tool. It must never expose private note bodies, task descriptions, draft or message bodies, customer names or emails, addresses, payment data, or unrestricted source snapshots. Diagnostics should remain aggregate and provider-operational only.[1] [2]

## Deferred live validation

When a qualified customer becomes available, the customer must sign into their own account and enable Provider relationship messages. Chisolm Audio may then create a low-risk draft, review the exact body, and deliberately send one in-app message. Verify one message link, the existing conversation, safe body-free Customers activity metadata, no external notification, and reversible customer opt-out. Record the result without copying message content into monitoring or audit notes.[3] [4]

## References

[1]: ./CRM_PHASE_8_IMPLEMENTATION_REPORT.md "Customers Phase 8 Implementation Report"
[2]: ../../client/src/pages/admin/CustomersPilotHealthPanel.tsx "Owner-only monitoring workspace"
[3]: ../../server/crm/operations.ts "Audited Customers private rollout configuration"
[4]: ./CRM_PHASE_7_IMPLEMENTATION_REPORT.md "Consent-aware draft sending implementation"


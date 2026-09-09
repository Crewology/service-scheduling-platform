# Customers Private Pilot Monitoring and Rollout Checklist

## Purpose

This owner guide defines how to interpret the Customers Pilot workspace and how to pause or evaluate the private pilot without changing authoritative booking, quote, payment, invoice, message, or review records.[1] [2]

## Current decision

The current overall status is **Ready — live test verified**. Automated and real-user consent, authorization, exactly-once delivery, projection, entitlement, deletion, isolation, conversation, and no-external-delivery checks pass. The owner may prepare one additional controlled provider candidate, but provider 1 remains the sole allowlisted provider until a separate explicit approval.[1] [3]

## Second-pilot entry gate

Do not add another provider unless every integrity, entitlement, projection, sent-link, live-validation, and future-capability check is Ready; the candidate is active and retains the required lifecycle entitlement; at least one legitimate non-self relationship exists or can be established through a normal flow; a reachable customer-side tester is identified; and the owner intentionally updates the private allowlist through the audited configuration path. The monitoring screen never expands access automatically.[1] [4]

| Required condition | Expected state before expansion |
|---|---|
| Current pilot | Ready with one linked live validation |
| Candidate provider | Active, entitled, directly supported, and willing to provide feedback |
| Candidate relationship | Legitimate, qualified, and not a provider self-contact |
| Tenant integrity | 0 self-contacts, non-pilot contacts, and scoped-child mismatches |
| Projection health | 0 missing, stale, never-projected, or lagging relationships |
| Sent-message integrity | 0 sent-draft linkage issues |
| Future capabilities | Repair jobs and recommendations off; 0 enabled rules, runs, and saved segments |
| Owner action | Explicit, audited, reversible, and limited to one named provider |

## Safe disable order

If a privacy, consent, entitlement, message-link, or tenant-integrity check becomes Blocked, stop confirmed draft sending first. If the issue affects provider-authored records, stop provider writes next. Hide the provider read UI if relationships should no longer be visible, and stop projection writes last if source projection itself must be paused. Disabling Customers does not delete authoritative records or retained provider-authored data.[1] [4]

## Privacy rule

The monitoring workspace is not an admin surveillance tool. It must never expose private note bodies, task descriptions, draft or message bodies, customer names or emails, addresses, payment data, or unrestricted source snapshots. Diagnostics remain aggregate and provider-operational only.[1] [2]

## Completed live-validation standard

A qualified customer signs into their own account and enables Provider relationship messages. The pilot provider creates a low-risk private draft, reviews the exact body, and deliberately sends one in-app message after owner confirmation. Verify one message link, one conversation message, body-free Customers activity metadata, no notification or external delivery, customer receipt, and the customer’s chosen final permission state.[3]

## References

[1]: ./CRM_PHASE_8_IMPLEMENTATION_REPORT.md "Customers Phase 8 Implementation Report"
[2]: ../../client/src/pages/admin/CustomersPilotHealthPanel.tsx "Owner-only monitoring workspace"
[3]: ./CUSTOMERS_PILOT_LIVE_VALIDATION_REPORT.md "Completed Gary Studios live validation"
[4]: ../../server/crm/operations.ts "Audited Customers private rollout configuration"


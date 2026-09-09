# Customers Private Pilot Support Playbook

## Purpose

This playbook supports the private Customers pilot for **Chisolm Audio** and **Gary Studios**. Customers is a provider-scoped relationship projection over authoritative OlogyCrew activity. It is not a second booking, quote, payment, invoice, message, or review system.[1] [2]

## First response checklist

When a pilot provider reports a problem, first confirm the provider’s identity, active status, current effective plan, private allowlist membership, and Admin → Customers Pilot health status. Do not request or copy private note bodies, follow-up descriptions, draft text, customer addresses, payment data, or unrestricted source records into support notes.[2] [3]

| Reported issue | Safe first check | Expected behavior |
|---|---|---|
| Customers is missing | Confirm active provider, allowlist membership, `customersReadUi`, and `customerHistory` entitlement | Non-pilot, inactive, and ineligible providers are denied by the server. |
| Private tools disappeared | Confirm effective lifecycle tier and provider-write flag | Starter retains customer history but hides notes, follow-ups, manual stages, and drafts. Existing private records are retained and return with qualifying Pro or Business access. |
| Unknown relationship | Confirm it maps to a qualified authoritative interaction and is not the provider’s own account | Do not insert a contact manually. Use reconciliation or the audited owner backfill only after validating the source interaction. |
| Follow-up did not contact the customer | No delivery investigation is needed | Follow-ups are provider-private manual reminders and never send a message. |
| Draft cannot be sent | Confirm confirmed-sending flag, current customer permission, non-archived relationship, exact reviewed body, and provider entitlement | Saving remains private. Sending requires deliberate confirmation and a current permission check. |
| Message appears duplicated | Check sent-draft linkage and authoritative message ID | Retry should return the existing message. Do not send another draft while linkage is under review. |
| Admin health is Blocked | Read the exact aggregate check; do not inspect private content | Resolve entitlement, tenant, projection, or linkage issues before any expansion. |

## Safe disable sequence

If privacy, consent, entitlement, message linkage, or tenant integrity is uncertain, turn off confirmed draft sending first. Turn off provider writes next if provider-authored mutations must pause. Hide the read UI only if relationships should no longer be visible, and stop projection writes last if source projection itself must pause. Use the owner-only audited configuration path; never edit operational rows ad hoc.[2] [3]

> Disabling a capability does not delete authoritative activity, provider-authored private records, or sent OlogyCrew conversations.

## Escalation evidence

An escalation should include the provider ID, provider business name, effective tier and lifecycle state, relationship ID if known, timestamp, operation attempted, normalized error, relevant aggregate health check, and authoritative source type and ID. It must exclude message bodies, private note bodies, task descriptions, addresses, payment secrets, and customer content not required to identify the record.[2]

## Current decision boundary

The supported private pilot contains exactly Chisolm Audio and Gary Studios. Gary Studios’ private tools depend on its Pro trial through September 23, 2026 or another qualifying lifecycle state. No third provider, AI feature, recommendation, automation, schedule, saved segment, export, repair job, or bulk-message feature is approved.[2] [4]

## References

[1]: ./CRM_TECHNICAL_ARCHITECTURE.md "Native Customers technical architecture"
[2]: ../../server/crm/health.ts "Privacy-safe pilot health aggregation"
[3]: ../../server/crm/operations.ts "Audited private rollout controls"
[4]: ./CUSTOMERS_PILOT_ROLLOUT_CHECKLIST.md "Customers private pilot rollout checklist"

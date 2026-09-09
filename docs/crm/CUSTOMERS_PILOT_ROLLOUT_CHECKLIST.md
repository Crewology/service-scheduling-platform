# Customers Private Pilot Monitoring and Rollout Checklist

## Current boundary

The private pilot contains exactly **Chisolm Audio** and **Gary Studios**. Admin → Customers Pilot is **Ready — live test verified**. No third provider is approved. The monitoring screen never changes access automatically.[1] [2]

| Current provider | Lifecycle state | Relationships | Pilot status |
|---|---|---:|---|
| Chisolm Audio | Business, active | 3 | Active private pilot |
| Gary Studios | Pro trial, effective through September 23, 2026 | 1 | Active private pilot; paid lifecycle access required |

## Ongoing two-provider checks

Keep both providers only while every provider remains active and entitled, tenant and scoped-child issue counts remain zero, projection reconciliation remains current, sent-draft links remain valid, and future capabilities remain locked. If Gary Studios returns to Starter, its write and draft tools are denied automatically; the owner should either restore qualifying access through the normal plan flow or remove the provider through the audited allowlist path.[1] [3]

## Safe disable order

If a privacy, consent, entitlement, message-link, or tenant-integrity check becomes Blocked, stop confirmed draft sending first. Stop provider writes next if the issue affects provider-authored records. Hide the provider read UI if relationships should no longer be visible, and stop projection writes last if source projection must be paused. Disabling Customers does not delete authoritative or retained provider-authored records.[1] [3]

## Third-provider gate

Do not add a third provider without a separate named owner approval. The candidate must be active, retain the required lifecycle entitlement, have at least one legitimate non-self relationship or establish one through a normal flow, identify a reachable customer-side tester, pass a non-writing projection assessment, and enter through the audited configuration and backfill path. Re-run cross-provider isolation, owner monitoring, and responsive checks after expansion.[1] [2]

## Privacy rule

The monitoring workspace is not an admin surveillance tool. It must never expose private note bodies, task descriptions, draft or message bodies, customer names or emails, addresses, payment data, or unrestricted source snapshots. Diagnostics remain aggregate and provider-operational only.[1] [2]

## References

[1]: ../../server/crm/health.ts "Privacy-safe multi-provider pilot monitoring"
[2]: ./CUSTOMERS_SECOND_PILOT_ROLLOUT_REPORT.md "Gary Studios second-provider rollout report"
[3]: ../../server/crm/operations.ts "Audited Customers private rollout configuration"


# Customers Phase 10 — Controlled Beta Readiness Scope

## Purpose

Phase 10 prepares an owner-controlled readiness review for a possible future 3–5 provider beta. It does **not** add a third provider, change the current allowlist, or enable a capability. This operational phase follows the two-provider stabilization decision and preserves the approved additive, tenant-scoped rollout posture.[1] [2]

## Why this is the next phase

The approved implementation sequence requires counts, idempotency, tenant isolation, privacy, entitlement lifecycle, responsive behavior, and regression safety before each broader rollout step.[3] Chisolm Audio and Gary Studios currently satisfy the two-provider technical gates, while two Gary Studios usability exercises remain intentionally deferred to the final Phase 10 gate.[1]

> Phase 10 answers “Is a named provider ready to be reviewed?” It does not answer “Should this provider be enrolled?” Enrollment remains a separate, deliberate owner decision.

## Approved deliverables

| Deliverable | Boundary |
|---|---|
| Candidate readiness assessment | Super-admin only; one provider ID at a time; aggregate provider-operational metadata only |
| Eligibility evidence | Active provider, lifecycle-aware Customers capabilities, legitimate non-self relationship count, projection dry-run result, and current pilot membership |
| Approval status | Explicitly **Pending owner approval** unless the provider is already allowlisted; no inferred approval |
| Cohort controls | Continue using the audited owner-only configuration and provider-bounded backfill procedures |
| Monitoring | Ready, Blocked, and Pending evidence states; no customer identity or private content |
| Deferred final gate | One real Gary Studios follow-up lifecycle and one provider-reviewed draft lifecycle before any beta decision |

## Explicit non-goals

Phase 10 does not implement Business saved segments, retention recommendations, automation controls, scheduled jobs, exports, bulk messaging, AI-generated drafts, repair schedules, public rollout, or automatic enrollment. The Phase 0 assessment labels saved segments and retention/automation controls as separately approval-gated future work, and the current owner approval is only for controlled beta readiness.[3]

## Acceptance criteria

The candidate assessment must never accept a browser-supplied provider ID in a provider-facing procedure. It may accept a provider ID only through a super-admin procedure. It must report lifecycle capabilities through the shared entitlement resolver, derive qualifying relationships from authoritative sources through the existing non-writing projection assessment, exclude self and unqualified interactions, avoid private content, and create no relationship or allowlist state.[3] [4]

The owner interface must distinguish **Ready for owner review**, **Blocked**, **Already in pilot**, and **Pending live evidence**. It must contain no enrollment button. Any later cohort change must use the existing audited configuration and bounded backfill path after a separately named approval.[2] [4]

## Current state carried forward

The enabled cohort remains exactly Chisolm Audio (`1`) and Gary Studios (`1350001`). AI, recommendations, automation, schedules, saved segments, exports, bulk messaging, repair jobs, and every other provider remain disabled. Gary Studios’ current private-tool access depends on its Pro trial through September 23, 2026.[1] [2]

## References

[1]: ./CRM_PHASE_9_STABILIZATION_REPORT.md "Customers Phase 9 stabilization report"
[2]: ./CUSTOMERS_PILOT_ROLLOUT_CHECKLIST.md "Customers private pilot rollout checklist"
[3]: ./CRM_PHASE_0_ASSESSMENT.md "Customers Phase 0 assessment and implementation sequence"
[4]: ../../server/crm/operations.ts "Audited Customers operations and non-writing projection assessment"

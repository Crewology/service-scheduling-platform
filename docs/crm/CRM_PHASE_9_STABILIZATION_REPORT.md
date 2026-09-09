# Customers Phase 9 — Two-Provider Pilot Stabilization Report

## Scope and boundary

Phase 9 stabilizes the approved two-provider private pilot for Chisolm Audio and Gary Studios. It does not add providers, AI, recommendations, automation, schedules, saved segments, exports, bulk messaging, repair jobs, or a public rollout.[1] [2]

## Audit baseline

The allowlist remains exactly `[1, 1350001]`. Chisolm Audio is active on Business with three qualified relationships, fifteen safe activity events, and one valid sent draft. Gary Studios is active on a Pro trial through September 23, 2026 with one qualified Lead, three safe activity events, and one provider-private note created during owner testing. Neither provider has a self-contact or a scoped-child mismatch. No non-pilot contact, enabled automation rule, automation run, saved segment, or sent-link issue exists.[2] [3]

The focused Customers baseline passed four files and 64 tests. Existing regressions cover private notes, manual follow-ups, exact open-task counts, stage overrides, draft review, customer consent, confirmed exactly-once sending, conversation linkage, lifecycle denial, projection safety, and cross-provider isolation.[4] [5]

## Evidence-based findings before changes

| Finding | Evidence | Stabilization decision |
|---|---|---|
| Workspace messaging copy is stale | The Customers landing page states “Nothing here sends a message,” while the approved relationship detail supports deliberate consent-aware in-app sending. | Replace the absolute statement with capability-aware copy that distinguishes private tools from separately confirmed in-app sending. |
| Read-only lifecycle state lacks explanation | When paid Customers entitlements are unavailable, the server correctly hides retained notes, tasks, and drafts, but relationship detail removes all private-tool sections without explaining why. | Add a concise read-only notice explaining that customer history remains available while Pro or Business is required for private tools, and that retained data is not deleted. |
| Relationship-detail messaging language is accurate | The detail page states that drafts remain private until deliberate confirmation and that sending requires current customer permission. | Preserve the existing detail and confirmation workflow. |
| Customer permission copy is clear | Notification Settings explains that permission is off by default, reversible, in-app only, and separate from email, SMS, push, and marketing. | Preserve the existing permission design. |

No data mutation was performed during this audit.

## Lifecycle stabilization

Deterministic lifecycle tests now exercise a Pro-to-Starter-to-Pro sequence without changing Gary Studios’ real subscription. Starter retains the provider’s Customers history, makes the workspace read-only, hides retained notes, follow-ups, drafts, and manual-stage controls, and denies every related write and send mutation. Returning to Pro restores the same retained private records. Owner monitoring changes to Blocked while an allowlisted provider lacks the required entitlement and returns to Ready after qualifying access is restored.[4] [5]

Gary Studios remains on a real Pro trial through September 23, 2026. The final state check confirms two active pilot providers, one qualifying Gary Studios subscription, one Gary Studios relationship, one retained private note, zero self-contacts, zero non-pilot contacts, zero scoped-child mismatches, zero sent-link issues, and no enabled rule, automation run, or saved segment.[2] [3]

## Usability and support changes

The Customers workspace no longer says that nothing can send a message. It now accurately explains that notes and follow-ups stay private and that an in-app message can be sent only from a reviewed draft after deliberate confirmation and a current customer-permission check. Nothing runs automatically or changes a booking.[4] [6]

Both the workspace and relationship detail now show an explicit lifecycle notice when paid Customers tools are unavailable. The notice explains that Starter keeps customer history available, qualifying Pro or Business access is required for private tools, retained records are not deleted, and plans can be reviewed through the existing subscription page.[4] [6]

The Help Center now includes separate customer consent guidance and provider Customers guidance. Both article titles render in their established customer and provider sections; the customer article expands with the complete default-off, reversible, in-app-only explanation and a working Notification Settings link. A support playbook documents first checks, safe disable order, privacy exclusions, escalation evidence, and the exact two-provider boundary.[6] [7]

## Validation

The final adjacent matrix passed **22 files and 205 tests** across Customers, Phase 9 support contracts, projection, lifecycle entitlements, account deletion, provider workspace, messaging, notification preferences, payment gates, and inactive-provider boundaries. TypeScript completed with zero errors, `git diff --check` passed, and the production build succeeded with only the existing large-chunk warning. Desktop and 390-pixel mobile reviews confirmed the corrected workspace copy and preserved relationship-tool hierarchy. The Help Center article interaction was also reviewed. Fresh application requests returned successfully; the only development log item was the known Vite hot-refresh invalidation for a file exporting helper functions, followed by a normal reload.[4] [5] [6] [8]

## Phase 9 rollout decision

**Decision: retain the two-provider private pilot and do not expand to a 3–5 provider beta yet.** Chisolm Audio and Gary Studios are active, entitled, isolated, and healthy, and the consent-aware live message path has been validated. However, Gary Studios is still trial-dependent and has only one qualified relationship. Before approving a wider beta, the owner should decide Gary Studios’ post-trial plan and complete at least one real Gary Studios follow-up lifecycle plus one provider-reviewed draft lifecycle on its existing relationship. Automated coverage for those workflows is already green; the remaining gate is provider usability evidence, not a security or data-integrity defect.[2] [4] [5]

No allowlist or rollout flag changed during Phase 9.

## References

[1]: ./CUSTOMERS_PILOT_ROLLOUT_CHECKLIST.md "Customers Private Pilot Monitoring and Rollout Checklist"
[2]: ./CUSTOMERS_SECOND_PILOT_ROLLOUT_REPORT.md "Customers Second Private Pilot Rollout Report"
[3]: ../../server/crm/health.ts "Privacy-safe pilot health aggregation"
[4]: ../../server/customers-phase4.test.ts "Customers workflow, authorization, and UI contracts"
[5]: ../../server/customers-phase8.test.ts "Two-provider monitoring and tenant-isolation regressions"
[6]: ../../client/src/pages/ProviderCustomers.tsx "Provider Customers workspace"
[7]: ./CUSTOMERS_PILOT_SUPPORT_PLAYBOOK.md "Customers private pilot support playbook"
[8]: ../../server/customers-phase9.test.ts "Phase 9 support and usability contracts"

# Customers Phase 5 Implementation Report

## Executive summary

Customers Phase 5 adds only **manual relationship-stage controls** for Chisolm Audio, provider 1, as the existing private pilot. A provider can choose an approved Customers stage or clear the override to resume the stage derived from authoritative OlogyCrew activity. No booking, quote, payment, message, review, source projection, or public provider data is changed.

| Capability | Phase 5 result |
|---|---|
| Manual stage | New lead, Quoted, Booked, Customer, Repeat customer, Dormant, or Archived |
| Automatic mode | Clears the override and immediately resumes the current derived stage |
| Provider history | Atomic append-only stage history with previous stage, next stage, provider source, actor, reason, and time |
| Relationship activity | Safe stage-change or automatic-restoration summary with stage metadata only |
| Workspace placement | Relationship detail and Leads/Customers placement refresh after a saved change |
| Rollout | Active provider + provider 1 pilot membership + read UI + provider writes + lifecycle `crmStageOverrides` entitlement |

## Security and data authority

The mutation accepts a contact ID and stage only. Provider ownership and actor identity are derived from the authenticated session. A contact owned by another provider returns not found and does not reveal whether that relationship exists.

The repository writes `crm_contacts.manualStage` and one immutable `crm_contact_stage_history` row in the same database transaction. The derived stage is not overwritten. Clearing an override sets `manualStage` to null, so `COALESCE(manualStage, derivedStage)` immediately returns to authoritative source-derived organization. Archiving records the provider actor and archive time; selecting another stage or Automatic clears those archive fields.

Repeating the same manual mode and stage is a no-op: it creates neither duplicate history nor duplicate activity. Clearing a manual stage still records the mode change even if its effective stage matches the derived stage. Safe activity metadata contains only previous stage, next stage, and the server-generated reason. No private note, task description, message body, address, payment detail, or unrestricted source snapshot is accepted or logged.

## Provider experience

The relationship detail now includes one compact **Relationship stage** card between the relationship header and business summary. It identifies the current mode as Automatic or Manual and explains that a manual stage changes only where the relationship is organized. The selector is built from the authoritative shared Customers stage contract, and Automatic shows the current derived stage.

Saving refreshes both relationship detail and the Customers workspace, so Leads/Customers placement changes without a page reload. The responsive card stacks the selector and action button on mobile. No workflow builder, pipeline board, required reason field, bulk action, automation, or outbound communication control was added.

## Validation

| Validation gate | Result |
|---|---|
| Focused router, UI-contract, and real-database repository coverage | 2 files and 21 tests passed |
| Adjacent Customers, projection, entitlement, deletion, provider workspace, payment gate, and inactive-provider matrix | 18 files and 118 tests passed |
| TypeScript | Zero errors |
| Diff integrity | `git diff --check` passed |
| Production build | Passed; existing large-chunk advisory remains non-blocking |
| Desktop review | Automatic/manual card, layout hierarchy, and complete selector reviewed using the authenticated Chisolm Audio session |
| Mobile review | Relationship detail reviewed at 390 × 844 with no horizontal overflow and existing tools preserved |
| Runtime/network review | Customers access and detail requests returned 200; `stageOverridesEnabled` was true only in the entitled pilot context |

Vitest continues to print the known process-close timeout after successful suites because an existing open handle prevents immediate process exit. The test assertions passed and the validation command proceeded successfully through TypeScript, diff, and production build.

The fresh browser log contained only the previously documented local Vite development WebSocket reconnect error. It did not affect application requests or the production build. The known unrelated legacy full-suite failures recorded in the Phase 4 report were not weakened or rewritten for this phase.

## Final private state

| Private state | Verified value |
|---|---|
| Pilot providers | `[1]` only |
| Qualified relationships | 2 |
| Provider self-contacts | 0 |
| Existing activity events | 11 |
| Real manual stage overrides created during review | 0 |
| Real provider stage-history rows created during review | 0 |
| Real contact-stage events created during review | 0 |
| Existing notes / tasks | 0 / 0 |
| `customersProjectionWrites` | `true` |
| `customersReadUi` | `true` |
| `customersProviderWrites` | `true` |
| `customersRepairJobs` | `false` |
| `customersRecommendations` | `false` |
| `customersDraftSending` | `false` |

No new rollout flag, schedule, managed job, recommendation, message draft, send path, saved segment, export, or provider-wide release was added.

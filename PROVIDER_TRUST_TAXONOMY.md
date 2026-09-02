# OlogyCrew Provider Trust and Verification Taxonomy

**Status:** Authoritative implementation specification  
**Owner:** OlogyCrew  
**Last updated:** September 2, 2026

## Purpose

OlogyCrew must show customers exactly what the platform knows, how it knows it, and what it does **not** guarantee. A document upload is only a submission. A Stripe connection is only a payment-account signal. A numerical reputation score is only a profile and activity signal. None of those facts, alone or together, may be presented as blanket provider verification.

> **Verification is evidence-specific.** OlogyCrew may state that a particular identity, business, license, insurance, or background-check document was reviewed and accepted. OlogyCrew must not convert those narrow findings into a general claim that the provider, every service, safety, quality, or suitability has been verified.

## Current-State Audit

| Area | Current behavior | Risk | Required correction |
|---|---|---|---|
| Provider-level status | `serviceProviders.verificationStatus` stores one `pending`, `verified`, or `rejected` value | A single badge hides which evidence was actually reviewed | Retain only as a compatibility summary; public and admin UI must use per-evidence states |
| Automatic verification | Approval of any two uploaded documents can mark the provider `verified` | Two unrelated documents can create a blanket verified claim | Remove count-based auto-verification and derive each signal independently |
| Document submission | Uploading a replacement updates the existing row | Prior evidence and review history are overwritten | Insert a new immutable submission and preserve prior rows and audit entries |
| Review controls | Admin can directly verify a provider without evidence | Manual status can bypass evidence review | Remove direct blanket verification; review or revoke individual evidence records |
| Rejection and deletion | Rejected or deleted evidence does not reliably revoke the provider-level badge | Public claims can remain after evidence is invalidated | Derive all public signals from current approved, unexpired, non-revoked evidence |
| Expiry | `expirationDate` is stored but not used by public trust claims | Expired insurance or licenses can remain displayed as current | Resolve expiry at read time and label expired evidence clearly in provider/admin UI |
| Automated score | Profile, Stripe, bookings, reviews, and account age produce levels named `Trusted` and `Top Pro` | Behavioral/profile signals can be confused with credential verification | Rename public standing labels and explicitly separate them from evidence review |
| Public profile | Insurance and background-check booleans are displayed without evidence date or scope | Customers cannot tell what was reviewed or whether it is current | Publish per-signal state, review date, and expiration date where appropriate |
| Public API | One `verified` boolean exposes the coarse provider status | AI agents receive an overbroad, unexplained claim | Expose structured evidence signals; legacy `verified` may mean only identity evidence reviewed |
| Completed work and reviews | Booking and review counts are mixed into a general score | Platform-verified activity is not shown directly | Show completed OlogyCrew bookings and booking-linked reviews as separate factual signals |
| Demo/test supply | Official/demo status can coexist with trust fields | Demo data could be mistaken for verified marketplace supply | Suppress all evidence badges for official/demo/test providers and label official demos explicitly |

## Authoritative Signal Model

| Signal | Evidence or source | Public wording when current | Public wording when absent or non-current |
|---|---|---|---|
| Email ownership | Completed email verification challenge | `Email confirmed` in account-facing UI only | Not publicly displayed |
| Government identity | Admin-approved government ID submission | `Identity reviewed` | Not displayed publicly; provider sees `Not submitted`, `Pending`, `Rejected`, `Expired`, or `Revoked` |
| Business registration | Admin-approved business registration or formation evidence | `Business registration reviewed` | Same evidence-state vocabulary; absence is not a negative badge |
| Professional license | Admin-approved license evidence, with jurisdiction and expiry when applicable | `Professional license reviewed` | Never display `Licensed` without a current approved license record |
| Insurance | Admin-approved insurance certificate with a future expiration date | `Insurance reviewed · current through {date}` | Never display `Insured` from a boolean alone |
| Background check | Admin-approved result from an identified screening source, with review/expiry dates | `Background check reviewed` | Do not imply continuous monitoring or guaranteed safety |
| OlogyCrew completed work | Count of bookings whose status is `completed` | `{n} booking(s) completed through OlogyCrew` | `New on OlogyCrew` when the count is zero |
| Booking-linked reviews | Reviews that reference a completed OlogyCrew booking and are not hidden | `{n} review(s) from completed OlogyCrew bookings` plus the actual average rating | Do not fabricate, seed, infer, or import unsupported reviews |
| Provider standing | Deterministic profile/activity score | `Building History`, `Established`, or `Top Activity` | Must state that standing reflects profile completeness and OlogyCrew activity, not credential verification |
| Stripe account | Current Connect account capability | `Payments available through OlogyCrew` only where transactionally relevant | Must not be called identity, business, or provider verification |

## Evidence Types and Metadata

The document system uses these canonical evidence types: `identity`, `business_license` (displayed as **Business registration** for compatibility), `professional_license`, `insurance`, and `background_check`.

Every submission must retain its immutable storage URL, provider, evidence type, upload time, submission status, reviewer, review time, rejection or revocation reason, and applicable metadata. Metadata includes a provider-facing document label, issuer, credential or policy identifier, jurisdiction, issue date, and expiration date. Sensitive identifiers must not be exposed publicly.

## Evidence State Machine

| State | Meaning | Entry rule | Exit rule | Public display |
|---|---|---|---|---|
| `not_submitted` | No evidence exists for the signal | Derived when no submissions exist | Provider uploads evidence | Hidden |
| `pending` | Evidence was submitted but not accepted | New upload | Admin approves or rejects | Hidden |
| `verified` | Admin accepted the evidence and it is not expired or revoked | Admin approval with required metadata | Expiry, revocation, or deletion under controlled rules | Signal-specific `reviewed` label |
| `rejected` | Evidence did not satisfy review requirements | Admin rejection with a reason | Provider uploads a new submission | Hidden |
| `expired` | Previously approved evidence is past its expiration date | Derived at read time | Provider submits and admin approves current evidence | Hidden; visible to provider/admin |
| `revoked` | Admin invalidated previously approved evidence | Admin revocation with a reason | New evidence is submitted and approved | Hidden; visible to provider/admin |

An approved, unexpired earlier record may continue supporting a signal while a replacement is pending. A pending replacement never upgrades or downgrades the current signal by itself. The resolver chooses the newest current approved record; otherwise it returns the newest submission state.

## Required Metadata by Evidence Type

| Evidence type | Required for submission | Required for approval | Expiration rule |
|---|---|---|---|
| Government identity | Document label | Reviewer confirmation | Expiry optional; if supplied, it is enforced |
| Business registration | Document label | Issuer or jurisdiction when shown by the document | Expiry optional |
| Professional license | Document label, jurisdiction | Issuer and credential identifier | Expiry required when the credential has an expiration date |
| Insurance | Document label, expiration date | Issuer or carrier and policy/credential identifier | Future expiration date required for a current public signal |
| Background check | Document label | Issuer or screening source | Review is current for one year unless an earlier supplied expiration date applies |

## Provider-Level Compatibility Summary

The legacy provider `verificationStatus` remains temporarily for compatibility, but it is no longer an authorization or public-trust source. It is derived only from government identity evidence: `verified` means current government identity evidence was reviewed; `rejected` means the newest identity submission was rejected or revoked and no current approved identity record exists; otherwise the status is `pending`.

## Public Presentation Rules

Public provider pages and search cards must present two visually separate groups. **Evidence reviewed by OlogyCrew** contains only current signal-specific evidence. **OlogyCrew activity** contains completed-booking count, booking-linked review count/rating, member-since date, and provider standing. Tooltips must explain scope and must never use an unlabeled shield or a generic `Verified Provider` claim.

If a provider has no current evidence, the evidence group may be omitted. The platform must not display negative `unverified` warnings; absence simply means OlogyCrew is not making that evidence claim.

Official demo and explicitly marked test providers must never display identity, business, license, insurance, or background-check verification signals, must never contribute public marketplace ratings or testimonials, and must never appear as verified marketplace supply. An official demo may display `Official OlogyCrew demo` as a separate product label.

## Admin Review Rules

Administrators review one submission at a time. Approval and rejection require the evidence type, reviewer, timestamp, and an audit entry. Rejection and revocation require a reason. Approved evidence is immutable to providers; providers may submit replacement evidence but may not erase the historical reviewed record. Admin views must show current, expiring within 30 days, expired, rejected, revoked, and pending states separately.

The existing platform audit log is the authoritative review-history ledger. Actions include `verification_document_submitted`, `verification_document_approved`, `verification_document_rejected`, `verification_document_revoked`, and `verification_document_deleted`. Each entry records the evidence type, provider, document ID, previous state, new state, and reason where applicable.

## Authorization and Safety Rules

Only the provider that owns the profile may submit evidence. Only administrators may view every provider’s private evidence or approve, reject, or revoke it. Evidence URLs are private review artifacts and must not be included in public profile or public API responses. Public consumers receive only the structured signal, scope explanation, review date, and non-sensitive expiration/jurisdiction metadata.

Marketplace access, booking access, plan entitlements, search eligibility, and payment collection must not depend on evidence verification unless OlogyCrew explicitly introduces a category-specific legal requirement in a later policy. Evidence status is a customer-information signal, not a paid-plan benefit and not a substitute for the subscription entitlement model.

## Implementation Acceptance Criteria

Implementation is complete when all document writes preserve history, expiry is resolved deterministically, provider-level blanket approval no longer bypasses evidence, admin actions are audited, public pages and APIs expose structured signals, behavioral standing is renamed, completed bookings and booking-linked reviews are factual, demo/test signals are suppressed, and regression tests prove every transition and authorization boundary.

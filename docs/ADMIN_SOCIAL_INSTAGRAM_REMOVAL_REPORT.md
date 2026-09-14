# Admin Social Posting — Instagram Removal

**Status:** Complete  
**Date:** September 14, 2026  
**Database changes:** None

## Summary

Instagram has been removed from the active **Admin Social Media** posting feature. New AI-generated posts, manual drafts, scheduled posts, and publish-now actions now support **Facebook and LinkedIn only**. The weekly Monday schedule remains unchanged and will use the two active channels after this checkpoint is published.

## Behavior

| Area | Result |
|---|---|
| Admin information banner | Lists Facebook and LinkedIn only. |
| Create Post channel selector | Offers Facebook and LinkedIn only, selected by default. |
| Server input validation | Rejects Instagram as a new Admin post channel. |
| AI previews and generated posts | Store Facebook and LinkedIn as their active channels. |
| Publish now and weekly auto-posting | Fan out only to Facebook and LinkedIn. |
| Existing manual drafts | Honor their selected active Facebook/LinkedIn channels instead of publishing indiscriminately. |
| Historical posts containing Instagram | Remain stored for audit continuity, but Instagram is filtered from active Admin channel and result badges. |
| Admin system health | No longer calculates or exposes Instagram readiness. |

## Files changed

| File | Purpose |
|---|---|
| `shared/adminSocialPlatforms.ts` | Defines the authoritative Facebook/LinkedIn Admin channel set and safely filters legacy selections. |
| `client/src/pages/AdminSocialMedia.tsx` | Removes Instagram controls and copy while retaining responsive post creation and history. |
| `server/routers/socialMediaRouter.ts` | Restricts new Admin post inputs to Facebook and LinkedIn. |
| `server/socialMedia.ts` | Removes Instagram publishing and routes each post only to its supported selected channels. |
| `server/systemHealth.ts` | Removes dormant Instagram readiness from the Admin health response. |
| `server/social-media.test.ts` | Updates runtime expectations for two-channel publication and legacy filtering. |
| `server/admin-social-channels.test.ts` | Locks the supported channel set and prevents Instagram UI, validation, publishing, or health paths from returning. |
| `docs/ADMIN_SOCIAL_INSTAGRAM_REMOVAL_REPORT.md` | Records implementation, validation, and unchanged behavior. |
| `todo.md` | Tracks the update through completion. |

## Validation

| Gate | Result |
|---|---|
| Focused validation | **4 files and 16 tests passed.** |
| Adjacent release gate | **7 files and 54 tests passed.** |
| TypeScript | **Passed with zero errors.** |
| Diff validation | **`git diff --check` passed.** |
| Production build | **Passed in 32.01 seconds.** |
| Desktop review | Admin Social Media displayed Facebook and LinkedIn only in current channel messaging and badges. |
| Mobile review | The two-channel Admin page remained readable at 390 × 844 without horizontal clipping. |
| Source audit | No Instagram reference remains in the active Admin social UI, router validation, publishing service, health response, or shared supported-channel map. |

Vitest reported its known post-completion close timeout after all assertions passed. The production build retained the existing large-chunk advisory. Neither warning caused a test, type, diff, or build failure.

## Intentionally unchanged

No social-post row or historical result was deleted or rewritten. Facebook and LinkedIn credentials, posting implementations, authorization, content generation, weekly schedule, post history, and Admin access controls remain intact. The dormant Instagram environment variable and unrelated references to an Instagram bio on provider marketing pages remain available for a possible future integration; they are not part of Admin auto-posting.

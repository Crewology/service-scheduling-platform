# OlogyCrew Integration Prerequisites

This document records the remaining integration work that cannot be completed safely without owner-controlled external account setup. It contains no secret values.

| Integration | Current state | Required owner action before implementation |
|---|---|---|
| Custom Google OAuth | Implemented and active | None |
| Sign in with Apple | Intentionally deferred by the owner; Google and email/password remain supported | No action required for the current release; revisit only when Apple login becomes a product requirement |
| Facebook Page publishing | Configured | Maintain the current Page token and Page ID when Meta rotates or revokes access |
| LinkedIn organization publishing | Configured | Maintain the current access token and organization ID when access changes |
| Instagram publishing | Intentionally deferred while the owner completes the external account connection | No platform change is required now; revisit after the intended professional account and Business account identifier are confirmed |

The platform should not display an Instagram publishing action until the account is connected and verified. Sign in with Apple should be introduced only as a separately approved authentication release; it is not required for the current Google and email/password login flows to remain operational.

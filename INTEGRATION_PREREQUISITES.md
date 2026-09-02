# OlogyCrew Integration Prerequisites

This document records the remaining integration work that cannot be completed safely without owner-controlled external account setup. It contains no secret values.

| Integration | Current state | Required owner action before implementation |
|---|---|---|
| Custom Google OAuth | Implemented and active | None |
| Sign in with Apple | Not implemented; no Apple connector or Apple authentication configuration is present | Register the OlogyCrew web authentication configuration with Apple and securely provide the resulting application credentials through project Secrets |
| Facebook Page publishing | Configured | Maintain the current Page token and Page ID when Meta rotates or revokes access |
| LinkedIn organization publishing | Configured | Maintain the current access token and organization ID when access changes |
| Instagram publishing | OlogyCrew has no configured Instagram Business account ID; the available Instagram connector is currently disabled | Connect the intended Instagram professional account to the correct Facebook Page, confirm publishing permissions, and enable the Instagram integration or securely provide the Business account identifier through project Secrets |

The platform should not display an Instagram publishing action until the account is connected and verified. Sign in with Apple should be introduced as a separate authentication release after its credentials and redirect configuration are available; it is not required for the current Google and email/password login flows to remain operational.

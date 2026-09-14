export const ADMIN_SOCIAL_PLATFORMS = ["facebook", "linkedin"] as const;

export type AdminSocialPlatform = (typeof ADMIN_SOCIAL_PLATFORMS)[number];

export const ADMIN_SOCIAL_PLATFORM_OPTIONS: ReadonlyArray<{
  id: AdminSocialPlatform;
  label: string;
}> = [
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
];

export function isAdminSocialPlatform(platform: string): platform is AdminSocialPlatform {
  return ADMIN_SOCIAL_PLATFORMS.includes(platform as AdminSocialPlatform);
}

export function normalizeAdminSocialPlatforms(
  platforms: readonly string[] | null | undefined,
): AdminSocialPlatform[] {
  if (!platforms) return [...ADMIN_SOCIAL_PLATFORMS];
  return platforms.filter(isAdminSocialPlatform);
}

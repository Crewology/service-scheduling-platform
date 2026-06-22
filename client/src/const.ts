export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirect to the custom login page.
// This replaces the old Manus OAuth portal redirect.
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath) {
    return `/login?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};

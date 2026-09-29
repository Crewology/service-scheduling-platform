import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const navHeader = readFileSync(resolve(root, "client/src/components/shared/NavHeader.tsx"), "utf8");
const providerWorkspace = readFileSync(resolve(root, "client/src/components/provider/ProviderWorkspaceShell.tsx"), "utf8");

const desktopMenuStart = navHeader.indexOf("function UserMenuDropdown");
const desktopMenuEnd = navHeader.indexOf("// Mobile menu tile data");
const desktopAccountMenu = navHeader.slice(desktopMenuStart, desktopMenuEnd);

const mobileMenuStart = navHeader.indexOf("const MOBILE_PROVIDER_TILES");
const mobileMenus = navHeader.slice(mobileMenuStart);

describe("NavHeader account menu", () => {
  it("removes My Page and My Calendar from the desktop account dropdown only", () => {
    expect(desktopMenuStart).toBeGreaterThanOrEqual(0);
    expect(desktopMenuEnd).toBeGreaterThan(desktopMenuStart);
    expect(desktopAccountMenu).not.toContain("My Page");
    expect(desktopAccountMenu).not.toContain("My Calendar");
    expect(desktopAccountMenu).not.toContain("provider.getMyProfile.useQuery");
  });

  it("preserves the remaining account dropdown destinations", () => {
    for (const label of ["My Account", "My Subscription", "Billing History", "Settings", "Help", "Log Out"]) {
      expect(desktopAccountMenu).toContain(label);
    }
  });

  it("preserves My Page and My Calendar outside the desktop account dropdown", () => {
    expect(providerWorkspace).toContain('label: "My Page", icon: Store');
    expect(providerWorkspace).toContain('label: "My Calendar", icon: CalendarClock, href: "/provider/calendar"');
    expect(mobileMenus).toContain('{ label: "My Page", icon: UserCircle, href: "/provider/my-page"');
    expect(mobileMenus).toContain("My Calendar");
  });
});

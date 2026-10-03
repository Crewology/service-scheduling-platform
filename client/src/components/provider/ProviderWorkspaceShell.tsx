import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";
import { MobileRoleViewToggle } from "@/components/shared/MobileRoleViewToggle";
import { cn } from "@/lib/utils";
import "./ProviderWorkspaceTheme.css";

export type ProviderWorkspaceSection =
  | "overview"
  | "bookings"
  | "customers"
  | "services"
  | "calendar"
  | "money"
  | "page"
  | "more";

const providerWorkspaceBackground =
  "min-h-[calc(100vh-4rem)] bg-page";

export function ProviderWorkspaceBackground({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(providerWorkspaceBackground, "ology-provider-workspace-surface", className)}>{children}</div>;
}

interface ProviderWorkspaceShellProps {
  active: ProviderWorkspaceSection;
  businessName?: string | null;
  profileSlug?: string | null;
  isPageLive?: boolean;
  customersVisible?: boolean;
  bookingBadgeCount?: number;
  children: ReactNode;
  contentClassName?: string;
}

const baseProviderNav = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, href: "/" },
  { key: "bookings", label: "Bookings", icon: CalendarDays, href: "/my-bookings" },
  { key: "services", label: "Services", icon: BriefcaseBusiness, href: "/provider/services" },
  { key: "calendar", label: "My Calendar", icon: CalendarClock, href: "/provider/calendar" },
  { key: "money", label: "Money", icon: CircleDollarSign, href: "/provider/finances" },
  { key: "page", label: "My Page", icon: Store, href: "/provider/dashboard?tab=my-page" },
] as const;

export function ProviderWorkspaceShell({
  active,
  businessName,
  profileSlug,
  isPageLive,
  customersVisible = false,
  bookingBadgeCount = 0,
  children,
  contentClassName,
}: ProviderWorkspaceShellProps) {
  const scopedProviderNav = baseProviderNav.map((item) =>
    item.key === "page" && profileSlug ? { ...item, href: `/${profileSlug}` } : item,
  );
  const providerNav = customersVisible
    ? [
        ...scopedProviderNav.slice(0, 2),
        { key: "customers" as const, label: "Customers", icon: Users, href: "/provider/customers" },
        ...scopedProviderNav.slice(2),
      ]
    : scopedProviderNav;
  const compactMobileNav = [
    { key: "overview" as const, label: "Home", icon: LayoutDashboard, href: "/" },
    { key: "bookings" as const, label: "Bookings", icon: CalendarDays, href: "/my-bookings" },
    customersVisible
      ? { key: "customers" as const, label: "Customers", icon: Users, href: "/provider/customers" }
      : { key: "calendar" as const, label: "Calendar", icon: CalendarClock, href: "/provider/calendar" },
    { key: "services" as const, label: "Services", icon: BriefcaseBusiness, href: "/provider/services" },
    { key: "money" as const, label: "Money", icon: CircleDollarSign, href: "/provider/finances" },
    { key: "more" as const, label: "Tools", icon: Wrench, href: "/provider/tools" },
  ];

  return (
    <ProviderWorkspaceBackground className={active === "overview" ? "ology-provider-overview-surface" : undefined}>
      <div className="container max-w-7xl py-5 pb-28 sm:py-8 lg:pb-10" data-provider-workspace={active}>
        <MobileRoleViewToggle active="provider" />
        <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider workspace</p>
              <p className="mt-1 truncate font-semibold text-slate-950">{businessName || "Your business"}</p>
              <p className="text-xs text-slate-500">{isPageLive ? "Profile is live" : "Profile needs attention"}</p>
            </div>
            <nav className="p-2" aria-label="Provider workspace navigation">
              {providerNav.map((item) => {
                const Icon = item.icon;
                const selected = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    title={`Open provider ${item.label.toLowerCase()}`}
                    className={cn(
                      "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                      selected
                        ? "bg-[#eaf2ff] text-[#174a73]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.key === "bookings" && bookingBadgeCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{bookingBadgeCount}</span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-2">
              <Link
                href="/provider/tools"
                aria-current={active === "more" ? "page" : undefined}
                title="Open provider business tools"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active === "more" ? "bg-[#eaf2ff] text-[#174a73]" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Wrench className="h-4 w-4" />Business Tools
              </Link>
            </div>
          </div>
        </aside>

          <main className={cn("min-w-0", contentClassName)}>{children}</main>
        </div>

        <nav
          className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden"
          aria-label="Provider mobile navigation"
        >
          {compactMobileNav.map((item) => {
            const Icon = item.icon;
            const selected = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-semibold sm:text-[10px]",
                  selected ? "bg-blue-50 text-[#174a73]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ProviderWorkspaceBackground>
  );
}

interface ProviderWorkspacePageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ProviderWorkspacePageHeader({ eyebrow, title, description, actions }: ProviderWorkspacePageHeaderProps) {
  return (
    <section className="ology-provider-workspace-heading relative overflow-hidden rounded-[26px] bg-[#123f63] px-5 py-5 text-white shadow-[0_24px_70px_-38px_rgba(18,63,99,0.8)] sm:px-7 sm:py-6">
      <div className="ology-provider-workspace-heading-glow absolute -right-12 -top-20 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-blue-100">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

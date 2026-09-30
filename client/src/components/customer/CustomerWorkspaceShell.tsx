import type { ReactNode } from "react";
import {
  CalendarDays,
  Compass,
  Heart,
  Home,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { MobileRoleViewToggle } from "@/components/shared/MobileRoleViewToggle";
import { cn } from "@/lib/utils";

export type CustomerWorkspaceSection =
  | "home"
  | "explore"
  | "bookings"
  | "saved"
  | "messages";

type CustomerNavItem = {
  id: CustomerWorkspaceSection;
  label: string;
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
};

export const customerWorkspaceNav: CustomerNavItem[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "explore", label: "Explore", href: "/browse", icon: Compass },
  { id: "bookings", label: "My Bookings", mobileLabel: "Bookings", href: "/my-bookings", icon: CalendarDays },
  { id: "saved", label: "Saved Providers", mobileLabel: "Saved", href: "/saved-providers", icon: Heart },
  { id: "messages", label: "Messages", href: "/messages", icon: Inbox },
];

export function CustomerWorkspaceShell({
  active,
  children,
  maxWidth = "max-w-7xl",
  contentClassName,
  showDesktopNavigation = true,
}: {
  active: CustomerWorkspaceSection;
  children: ReactNode;
  maxWidth?: string;
  contentClassName?: string;
  showDesktopNavigation?: boolean;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page pb-28 md:pb-12">
      <div className={cn("container py-5 sm:py-7", maxWidth, contentClassName)}>
        <MobileRoleViewToggle active="customer" />

        {showDesktopNavigation ? (
          <nav
            aria-label="Customer workspace navigation"
            className="mb-5 hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.55)] md:flex"
          >
            {customerWorkspaceNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-[color,background-color,transform] duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-[#e8f3fa] text-[#123f63]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {children}
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur md:hidden"
        aria-label="Customer mobile navigation"
      >
        {customerWorkspaceNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                isActive ? "bg-blue-50 text-[#174a73]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.mobileLabel ?? item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function CustomerWorkspacePageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  variant = "workspace",
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: "workspace" | "discovery";
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-[28px] bg-[#123f63] px-5 py-6 text-white shadow-[0_24px_65px_-42px_rgba(14,60,95,0.9)] sm:px-7 sm:py-7 lg:px-9",
        variant === "discovery" && "sm:py-8 lg:py-9",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          variant === "discovery"
            ? "[background-image:radial-gradient(circle_at_12%_10%,rgba(85,189,232,0.3),transparent_32%),radial-gradient(circle_at_88%_0%,rgba(74,222,128,0.14),transparent_28%)]"
            : "[background-image:radial-gradient(circle_at_10%_15%,rgba(85,189,232,0.22),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.08),transparent_25%)]",
        )}
        aria-hidden="true"
      />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">{eyebrow}</p>
          <h1 className={cn("mt-2 font-bold tracking-[-0.03em]", variant === "discovery" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")}>
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="relative mt-6">{children}</div> : null}
    </header>
  );
}

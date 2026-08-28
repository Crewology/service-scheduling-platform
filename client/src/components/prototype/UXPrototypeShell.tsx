import { Button } from "@/components/ui/button";
import { PROTOTYPE_ROUTES } from "@/lib/uxPrototype";
import { ArrowLeft, CalendarDays, LayoutDashboard, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png";

type UXPrototypeShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  active: "provider" | "customer" | "booking";
  wide?: boolean;
};

const destinations = [
  { key: "provider", label: "Provider overview", href: PROTOTYPE_ROUTES.provider, icon: LayoutDashboard },
  { key: "customer", label: "Customer home", href: PROTOTYPE_ROUTES.customer, icon: Search },
  { key: "booking", label: "Adaptive booking", href: `${PROTOTYPE_ROUTES.booking}?mode=direct&query=A1`, icon: CalendarDays },
] as const;

export function UXPrototypeShell({ children, title, description, active, wide = false }: UXPrototypeShellProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <div className="border-b border-blue-100 bg-[#eaf2ff] px-4 py-2 text-center text-xs font-medium text-[#204a73] sm:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Review prototype · No bookings, quotes, payments, or account changes are submitted
        </span>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => setLocation(PROTOTYPE_ROUTES.customer)}
          >
            <img src={LOGO_URL} alt="OlogyCrew" className="h-8 w-auto" />
          </button>

          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-xs text-slate-500">{description}</p>
          </div>

          <nav className="ml-auto hidden items-center gap-1 rounded-xl bg-slate-100 p-1 lg:flex" aria-label="Prototype previews">
            {destinations.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                    active === item.key ? "bg-white text-[#174a73] shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button variant="outline" size="sm" className="shrink-0 bg-white" onClick={() => setLocation("/")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Exit preview</span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>

        <nav className="grid grid-cols-3 border-t border-slate-100 bg-white px-2 py-2 lg:hidden" aria-label="Prototype previews">
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors sm:flex-row sm:justify-center sm:text-xs ${
                  active === item.key ? "bg-blue-50 text-[#174a73]" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={`mx-auto w-full ${wide ? "max-w-[1500px]" : "max-w-7xl"} px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>
        {children}
      </main>
    </div>
  );
}

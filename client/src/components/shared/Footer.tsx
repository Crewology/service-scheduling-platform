import { Link } from "wouter";
import { ArrowRight, BriefcaseBusiness, Download, Search } from "lucide-react";
import { usePWAInstallContext } from "@/contexts/PWAInstallContext";
import { PaymentMethods } from "@/components/PaymentMethods";
import { useAuth } from "@/_core/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";

const footerLinkClass =
  "inline-flex min-h-9 items-center text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d2438]";

export function Footer({ forcePublic = false, compactPublicHome = false }: { forcePublic?: boolean; compactPublicHome?: boolean } = {}) {
  const { isInstalled: pwaInstalled, triggerInstall: pwaInstall } = usePWAInstallContext();
  const { isAuthenticated: accountAuthenticated } = useAuth();
  const isAuthenticated = accountAuthenticated && !forcePublic;
  const { isProviderView } = useViewMode();
  const workspaceLinks = isProviderView
    ? [
        { href: "/", label: "Provider Overview" },
        { href: "/my-bookings", label: "Bookings" },
        { href: "/provider/customers", label: "Customers" },
        { href: "/provider/services", label: "Services" },
        { href: "/provider/calendar", label: "My Calendar" },
        { href: "/provider/finances", label: "Money" },
        { href: "/provider/tools", label: "Business Tools" },
      ]
    : [
        { href: "/", label: "Customer Home" },
        { href: "/browse", label: "Explore Services" },
        { href: "/my-bookings", label: "My Bookings" },
        { href: "/saved-providers", label: "Saved Providers" },
        { href: "/messages", label: "Messages" },
        { href: "/monthly-planner", label: "Monthly Planner" },
        { href: "/bulk-booking", label: "Bulk Booking" },
      ];
  const subscriptionHref = isProviderView ? "/provider/subscription" : "/customer/subscription";
  const signedInDescription = isProviderView
    ? "Your workspace for managing services, bookings, payments, and customer relationships."
    : "Your workspace for finding services, managing bookings, and returning to providers you trust.";

  // The logged-out people-first marketing pages use the quiet compact footer.
  // Other public pages and signed-in workspaces retain the established shared footer.
  if (compactPublicHome && !isAuthenticated) {
    return (
      <footer className="or-demo-footer" aria-label="OlogyCrew public footer">
        <div className="or-demo-footer-inner or-live-footer-inner">
          <div className="or-live-footer-identity">
            <Link href="/" className="or-demo-footer-brand" aria-label="OlogyCrew homepage"><img src="/manus-storage/ologycrew-demo-mark_075b3913.png" alt="" /><span>Ology<span style={{ color: "#bd4b35" }}>Crew</span></span></Link>
            <p>Independent service businesses, one good connection at a time.</p>
          </div>
          <nav className="or-live-footer-links" aria-label="Public footer navigation">
            <Link href="/browse">Explore services</Link><Link href="/for-providers">For providers</Link><Link href="/pricing">Provider plans</Link><Link href="/referral-program">Referral program</Link><Link href="/help">Help</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>
          </nav>
          <small className="or-live-footer-copyright">© {new Date().getFullYear()} OlogyCrew</small>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#0d2438] text-white">
      <div className="container py-10 sm:py-12">
        {!isAuthenticated ? (
          <section
            aria-labelledby="footer-cta-title"
            className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#164f75] to-[#123f63] p-5 shadow-[0_22px_60px_-38px_rgba(56,189,248,0.75)] sm:p-7"
          >
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">One platform, two clear paths</p>
              <h2 id="footer-cta-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Find help or build your digital home.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-sky-50/80 sm:text-base">
                Explore services when you need support, or give your business one place for discovery, bookings, payments, and customer relationships.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Link
                href="/browse"
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#123f63]">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">Looking for a service?</span>
                    <span className="mt-0.5 block text-sm text-sky-50/75">Explore trusted providers.</span>
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>

              <Link
                href="/pricing"
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white p-4 text-[#123f63] transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">Growing a service business?</span>
                    <span className="mt-0.5 block text-sm text-slate-600">Get started as a provider.</span>
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}

        {isAuthenticated ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 py-4 md:grid-cols-[1.2fr_1fr_1fr] md:gap-10">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xl font-bold">OlogyCrew</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                {signedInDescription}
              </p>
            </div>

            <nav aria-label="Signed-in workspace footer navigation">
              <h4 className="font-semibold text-white">{isProviderView ? "Provider Workspace" : "Customer Workspace"}</h4>
              <ul className="mt-3 columns-1 space-y-1 sm:columns-2 md:columns-1">
                {workspaceLinks.map((item) => (
                  <li key={item.href}><Link href={item.href} className={footerLinkClass}>{item.label}</Link></li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Signed-in account and support footer navigation">
              <h4 className="font-semibold text-white">Account &amp; Support</h4>
              <ul className="mt-3 space-y-1">
                <li><Link href="/account" className={footerLinkClass}>My Account</Link></li>
                <li><Link href={subscriptionHref} className={footerLinkClass}>Manage Plan</Link></li>
                <li><Link href="/referral-program" className={footerLinkClass}>Referral Program</Link></li>
                <li><Link href="/help" className={footerLinkClass}>Help Center</Link></li>
                <li><Link href="/help#contact" className={footerLinkClass}>Contact Support</Link></li>
                {!pwaInstalled && (
                  <li>
                    <button type="button" onClick={pwaInstall} className={footerLinkClass}>
                      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Install App
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 py-10 md:grid-cols-4 md:gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xl font-bold">OlogyCrew</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
                The digital home where customers find service professionals and providers manage the relationship from discovery through payment.
              </p>
            </div>

            <nav aria-label="Explore footer navigation">
              <h4 className="font-semibold text-white">Explore</h4>
              <ul className="mt-3 space-y-1">
                <li><Link href="/browse" className={footerLinkClass}>Explore Services</Link></li>
                <li><Link href="/pricing" className={footerLinkClass}>Pricing</Link></li>
              </ul>
            </nav>

            <nav aria-label="Provider footer navigation">
              <h4 className="font-semibold text-white">For Providers</h4>
              <ul className="mt-3 space-y-1">
                <li><Link href="/for-providers" className={footerLinkClass}>Build Your Business Page</Link></li>
                <li><Link href="/pricing" className={footerLinkClass}>Provider Plans</Link></li>
                <li><Link href="/login" className={footerLinkClass}>Sign In</Link></li>
              </ul>
            </nav>

            <nav aria-label="Company and support footer navigation">
              <h4 className="font-semibold text-white">Company &amp; Support</h4>
              <ul className="mt-3 space-y-1">
                <li><Link href="/referral-program" className={footerLinkClass}>Referral Program</Link></li>
                <li><Link href="/help" className={footerLinkClass}>Help Center</Link></li>
                <li><Link href="/help#contact" className={footerLinkClass}>Contact Support</Link></li>
                {!pwaInstalled && (
                  <li>
                    <button type="button" onClick={pwaInstall} className={footerLinkClass}>
                      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Install App
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        )}

        <div className="border-t border-white/15 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="text-sm text-slate-400">&copy; 2026 OlogyCrew. All rights reserved.</p>
              <nav aria-label="Legal footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/terms" className={footerLinkClass}>Terms of Service</Link>
                <Link href="/privacy" className={footerLinkClass}>Privacy Policy</Link>
              </nav>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Secure checkout</p>
              <PaymentMethods size="sm" showLabel={false} showSecure={false} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

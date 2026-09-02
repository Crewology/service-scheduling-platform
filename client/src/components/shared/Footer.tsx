import { Link } from "wouter";
import { Download } from "lucide-react";
import { usePWAInstallContext } from "@/contexts/PWAInstallContext";
import { PaymentMethods } from "@/components/PaymentMethods";

export function Footer() {
  const { isInstalled: pwaInstalled, triggerInstall: pwaInstall } = usePWAInstallContext();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
          <div>
            <h3 className="font-bold text-xl mb-4">OlogyCrew</h3>
            <p className="text-sm opacity-80">
              Connecting customers with service professionals across everyday, business, and event needs.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/browse" className="hover:opacity-100">Browse Services</Link></li>
              <li><Link href="/search" className="hover:opacity-100">Search</Link></li>
              <li><Link href="/my-bookings" className="hover:opacity-100">My Bookings</Link></li>
              <li><Link href="/referrals" className="hover:opacity-100">Referral Program</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Providers</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/provider/dashboard" className="hover:opacity-100">My Dashboard</Link></li>
              <li><Link href="/provider/services/new" className="hover:opacity-100">Add Service</Link></li>
              <li><Link href="/provider/availability" className="hover:opacity-100">Manage Availability</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/pricing" className="hover:opacity-100">Plans & Pricing</Link></li>
              <li><Link href="/referral-program" className="hover:opacity-100">Referral Program</Link></li>
              <li><Link href="/help" className="hover:opacity-100">Help Center</Link></li>
              <li><Link href="/help#contact" className="hover:opacity-100">Contact Support</Link></li>
              <li><Link href="/terms" className="hover:opacity-100">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:opacity-100">Privacy Policy</Link></li>
              {!pwaInstalled && (
                <li>
                  <button
                    onClick={pwaInstall}
                    className="hover:opacity-100 inline-flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install App
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-background/20 pt-6 pb-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs opacity-70">We Accept</p>
            <PaymentMethods size="sm" showLabel={false} showSecure={false} />
          </div>
        </div>
        <div className="border-t border-background/20 pt-4 text-center text-sm opacity-80">
          <p>&copy; 2026 OlogyCrew. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

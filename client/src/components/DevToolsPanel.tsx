/**
 * DevToolsPanel — Development-only floating panel for testing SkillLink.
 *
 * Features:
 *  - Shows current auth state (user, role)
 *  - Quick-copy test account credentials
 *  - Links to key pages for each role
 *  - Only renders in development mode (import.meta.env.DEV)
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Test Account Data ────────────────────────────────────────────────────────

const TEST_ACCOUNTS = [
  {
    role: "customer" as const,
    label: "Customer",
    description: "Browse services, make bookings, leave reviews",
    color: "bg-blue-500",
    quickLinks: [
      { label: "Browse Services", path: "/browse" },
      { label: "My Bookings", path: "/my-bookings" },
      { label: "Search", path: "/search" },
    ],
  },
  {
    role: "provider" as const,
    label: "Provider",
    description: "Manage services, availability, and bookings",
    color: "bg-orange-500",
    quickLinks: [
      { label: "Provider Dashboard", path: "/provider/dashboard" },
      { label: "Create Service", path: "/provider/services/new" },
      { label: "Manage Availability", path: "/provider/availability" },
      { label: "My Reviews", path: "/provider/reviews" },
    ],
  },
  {
    role: "admin" as const,
    label: "Admin",
    description: "Platform oversight, verification, analytics",
    color: "bg-purple-500",
    quickLinks: [
      { label: "Admin Dashboard", path: "/admin" },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  customer: "bg-blue-100 text-blue-800 border-blue-200",
  provider: "bg-orange-100 text-orange-800 border-orange-200",
  admin: "bg-purple-100 text-purple-800 border-purple-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DevToolsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "navigate" | "info">("status");
  const { user, isAuthenticated, loading } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });
  const [, setLocation] = useLocation();

  // Only render in development
  if (!import.meta.env.DEV) return null;

  const currentRole = user?.role || "guest";
  const currentAccount = TEST_ACCOUNTS.find(a => a.role === currentRole);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    toast.success(`Navigated to ${path}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors border border-gray-600"
        title="Toggle Dev Tools"
      >
        <span className="text-yellow-400">⚙</span>
        <span className="font-semibold">DevTools</span>
        {isAuthenticated && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
            currentRole === "admin" ? "bg-purple-500" :
            currentRole === "provider" ? "bg-orange-500" :
            "bg-blue-500"
          }`}>
            {currentRole}
          </span>
        )}
        {!isAuthenticated && !loading && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-500">
            guest
          </span>
        )}
        <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-base">⚙</span>
              <span className="font-bold text-sm text-white">SkillLink DevTools</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-base leading-none"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {(["status", "navigate", "info"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Status Tab */}
          {activeTab === "status" && (
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-gray-400 text-center py-2">Loading auth state...</div>
              ) : isAuthenticated && user ? (
                <>
                  <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-green-400 font-semibold">● Authenticated</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Role</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        currentRole === "admin" ? "bg-purple-500" :
                        currentRole === "provider" ? "bg-orange-500" :
                        "bg-blue-500"
                      }`}>
                        {currentRole}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Name</span>
                      <span className="text-white truncate max-w-[140px]">{user.name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Email</span>
                      <button
                        onClick={() => copyToClipboard(user.email || "")}
                        className="text-blue-400 hover:text-blue-300 truncate max-w-[140px]"
                        title="Click to copy"
                      >
                        {user.email || "—"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">User ID</span>
                      <button
                        onClick={() => copyToClipboard(String(user.id))}
                        className="text-blue-400 hover:text-blue-300"
                        title="Click to copy"
                      >
                        #{user.id}
                      </button>
                    </div>
                  </div>

                  {currentAccount && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-[11px] mb-1">Current Role Capabilities:</p>
                      <p className="text-gray-300">{currentAccount.description}</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full bg-red-900/30 border-red-700 text-red-300 hover:bg-red-900/50 hover:text-red-200"
                  >
                    Sign Out (Switch Account)
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-gray-400">● Not Authenticated</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Sign in with a test account to explore different roles.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Navigate Tab */}
          {activeTab === "navigate" && (
            <div className="p-4 space-y-3">
              {TEST_ACCOUNTS.map(account => (
                <div key={account.role} className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${account.color}`}></span>
                    <span className="text-gray-300 font-semibold text-[11px] uppercase tracking-wide">
                      {account.label} Pages
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 pl-4">
                    {account.quickLinks.map(link => (
                      <button
                        key={link.path}
                        onClick={() => handleNavigate(link.path)}
                        className="text-left text-blue-400 hover:text-blue-300 hover:bg-gray-800 px-2 py-1 rounded transition-colors"
                      >
                        → {link.label}
                        <span className="text-gray-500 ml-1">{link.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                  <span className="text-gray-300 font-semibold text-[11px] uppercase tracking-wide">
                    Public Pages
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1 pl-4">
                  {[
                    { label: "Home", path: "/" },
                    { label: "Browse Categories", path: "/browse" },
                    { label: "Search Services", path: "/search" },
                  ].map(link => (
                    <button
                      key={link.path}
                      onClick={() => handleNavigate(link.path)}
                      className="text-left text-blue-400 hover:text-blue-300 hover:bg-gray-800 px-2 py-1 rounded transition-colors"
                    >
                      → {link.label}
                      <span className="text-gray-500 ml-1">{link.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="p-4 space-y-3">
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <p className="text-gray-300 font-semibold text-[11px] uppercase tracking-wide mb-2">
                  Test Account Roles
                </p>
                {TEST_ACCOUNTS.map(account => (
                  <div key={account.role} className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${account.color}`}></span>
                    <div>
                      <span className="text-white font-semibold">{account.label}:</span>
                      <span className="text-gray-400 ml-1">{account.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <p className="text-gray-300 font-semibold text-[11px] uppercase tracking-wide mb-2">
                  Testing Workflow
                </p>
                <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Sign in as <span className="text-orange-400">Provider</span> → create services</li>
                  <li>Sign out, sign in as <span className="text-blue-400">Customer</span></li>
                  <li>Browse &amp; book a service</li>
                  <li>Switch back to Provider → confirm booking</li>
                  <li>Customer leaves a review after completion</li>
                  <li>Check <span className="text-purple-400">Admin</span> dashboard for oversight</li>
                </ol>
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-300 font-semibold text-[11px] uppercase tracking-wide mb-2">
                  Platform Info
                </p>
                <div className="space-y-1 text-gray-400">
                  <div className="flex justify-between">
                    <span>Platform</span>
                    <span className="text-white">SkillLink</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories</span>
                    <span className="text-white">42</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commission</span>
                    <span className="text-white">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payments</span>
                    <span className="text-green-400">Stripe (Test Mode)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex items-center justify-between">
            <span className="text-gray-500 text-[10px]">DEV MODE ONLY</span>
            <span className="text-gray-500 text-[10px]">SkillLink v1.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevToolsPanel;

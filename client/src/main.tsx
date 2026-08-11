import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { BadgeManager } from "./components/BadgeManager";
import { ViewModeProvider } from "./contexts/ViewModeContext";
import { PWAInstallProvider } from "./contexts/PWAInstallContext";
import { getLoginUrl } from "./const";
import "./index.css";

// Handle post-logout cleanup: clear all client-side state when redirected from /api/auth/logout
(function handleLogoutCleanup() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('logged_out')) {
    // Clear all storage
    try { localStorage.clear(); } catch (e) { /* ignore */ }
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
    // Clear service worker caches
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    // Remove the query param from URL without reload
    params.delete('logged_out');
    const cleanUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Don't redirect to login if user is on a public page or select-role
  // This prevents login loops when unauthenticated queries fire on public pages
  const publicPaths = ["/", "/browse", "/search", "/plans", "/pricing", "/privacy", "/terms", "/help", "/contact", "/about", "/select-role", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/experiences"];
  const currentPath = window.location.pathname;
  const isPublicPage = publicPaths.includes(currentPath) ||
    currentPath.startsWith("/embed/") ||
    currentPath.startsWith("/p/") ||
    currentPath.startsWith("/unsubscribe/") ||
    currentPath.startsWith("/category/") ||
    currentPath.startsWith("/service/") ||
    currentPath.startsWith("/featured") ||
    // Clean provider profile URLs: single-segment paths like /chisolm-audio
    (/^\/[a-z0-9][a-z0-9-]*$/.test(currentPath) && !['provider','admin','messages','my-bookings','profile','notifications','analytics','referrals','receipts','my-reviews','my-quotes','my-waitlist'].includes(currentPath.slice(1)));

  if (isPublicPage) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      maxURLLength: 2048,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <BadgeManager />
      <ViewModeProvider>
        <PWAInstallProvider>
          <App />
        </PWAInstallProvider>
      </ViewModeProvider>
    </trpc.Provider>
  </QueryClientProvider>
);

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service worker registered", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed", err);
      });
  });
}

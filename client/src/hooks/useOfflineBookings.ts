import { useEffect, useState } from "react";

const BOOKINGS_CACHE_KEY = "ologycrew-offline-bookings";
const CACHE_TIMESTAMP_KEY = "ologycrew-bookings-cached-at";

interface CachedBookingData {
  bookings: any[];
  cachedAt: number;
}

/**
 * Caches booking data to localStorage whenever new data arrives,
 * and provides the cached version when offline.
 */
export function useOfflineBookings(onlineBookings: any[] | undefined, isLoading: boolean) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedBookings, setCachedBookings] = useState<any[] | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cache bookings to localStorage when we get fresh data
  useEffect(() => {
    if (onlineBookings && onlineBookings.length > 0) {
      try {
        const data: CachedBookingData = {
          bookings: onlineBookings,
          cachedAt: Date.now(),
        };
        localStorage.setItem(BOOKINGS_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (e) {
        console.warn("[OfflineBookings] Failed to cache bookings:", e);
      }
    }
  }, [onlineBookings]);

  // Load cached bookings when offline
  useEffect(() => {
    if (isOffline || (!onlineBookings && !isLoading)) {
      try {
        const cached = localStorage.getItem(BOOKINGS_CACHE_KEY);
        if (cached) {
          const data: CachedBookingData = JSON.parse(cached);
          setCachedBookings(data.bookings);
          setCachedAt(data.cachedAt);
        }
      } catch (e) {
        console.warn("[OfflineBookings] Failed to read cached bookings:", e);
      }
    }
  }, [isOffline, onlineBookings, isLoading]);

  // Return online data when available, cached data as fallback
  const bookings = onlineBookings || cachedBookings || [];
  const isUsingCache = !onlineBookings && !!cachedBookings;

  return {
    bookings,
    isOffline,
    isUsingCache,
    cachedAt,
    cacheAge: cachedAt ? Date.now() - cachedAt : null,
  };
}

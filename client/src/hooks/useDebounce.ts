import { useState, useEffect } from "react";

/**
 * Debounce a value by the given delay (ms).
 * The returned value only updates after the caller stops changing `value`
 * for at least `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

import { useState, useEffect, useMemo, useRef } from "react"

export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}



/**
 * Returns a debounced version of a callback.
 * The returned fn keeps the same reference between renders.
 * Great for autosave or any throttled side effect.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedFn<T extends (...args: any[]) => void | Promise<void>>(
  fn: T,
  delay: number
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // single shared timer
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);;

  const debounced = useMemo(() => {
    const wrapper = (...args: Parameters<T>) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    };

    (wrapper as T & {cancel: () => void}).cancel = () => {
      if (timer.current) clearTimeout(timer.current);
    };

    return wrapper as T;
  }, [delay]);

  // clear on unmount
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return debounced;
}
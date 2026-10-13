"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "a2z:flag";

/** A boolean persisted in LocalStorage; SSR-safe (false on the server and first render). */
export function useLocalFlag(key: string): [boolean, (v: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(EVENT, cb);
    };
  }, []);
  const get = useCallback(() => {
    try {
      return window.localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }, [key]);
  const value = useSyncExternalStore(subscribe, get, () => false);
  const set = useCallback(
    (v: boolean) => {
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* storage unavailable: fall through */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}

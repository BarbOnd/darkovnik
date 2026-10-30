import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: unknown };

type Loaded<T> = { load: () => Promise<T>; state: LoadState<T> };

/**
 * Runs `load` (memoize it with useCallback) and exposes its state. `reload()`
 * keeps showing the previous data until the new result arrives.
 */
export function useLoad<T>(load: () => Promise<T>): LoadState<T> & { reload(): void } {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setLoaded({ load, state: { status: "ready", data } }),
      (error: unknown) => active && setLoaded({ load, state: { status: "error", error } }),
    );
    return () => {
      active = false;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const state: LoadState<T> = loaded !== null && loaded.load === load ? loaded.state : { status: "loading" };
  return { ...state, reload };
}

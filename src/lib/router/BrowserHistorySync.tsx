import { useEffect, useRef } from "react";
import {
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";

/** Shape stored in each browser history entry's `state`. */
interface EntryState {
  wmmEntry: number;
}

/**
 * Keeps the browser's back/forward buttons working for a `MemoryRouter`
 * without ever changing the address bar.
 *
 * Every in-app navigation pushes a browser history entry that has the same
 * URL but carries an entry id in its state. When the user steps back or
 * forward, the id is looked up and the router is sent to the location that
 * entry was created for. It is route-agnostic: it reacts to whatever the
 * router navigates to, so new pages need no registration.
 *
 * Mount it once, inside the router.
 */
export function BrowserHistorySync() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();

  const nextId = useRef(0);
  const currentId = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);
  /** Set while applying a browser back/forward, so it is not re-pushed. */
  const restoring = useRef(false);
  const entries = useRef(new Map<number, Location>());

  // Router -> browser: mirror each router navigation into browser history.
  useEffect(() => {
    if (lastKey.current === location.key) return;
    const isFirst = lastKey.current === null;
    lastKey.current = location.key;

    if (restoring.current) {
      restoring.current = false;
      if (currentId.current !== null) {
        entries.current.set(currentId.current, location);
      }
      return;
    }

    if (isFirst || navType === "REPLACE") {
      const id = isFirst ? nextId.current++ : (currentId.current ?? 0);
      currentId.current = id;
      entries.current.set(id, location);
      window.history.replaceState({ wmmEntry: id } satisfies EntryState, "");
      return;
    }

    const id = nextId.current++;
    currentId.current = id;
    entries.current.set(id, location);
    window.history.pushState({ wmmEntry: id } satisfies EntryState, "");
  }, [location, navType]);

  // Browser -> router: back/forward goes to the location tied to that entry.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const id = (event.state as EntryState | null)?.wmmEntry;
      if (id === undefined) return;
      const target = entries.current.get(id);
      if (!target) return;
      currentId.current = id;
      restoring.current = true;
      navigate(
        { pathname: target.pathname, search: target.search, hash: target.hash },
        { replace: true, state: target.state }
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  return null;
}

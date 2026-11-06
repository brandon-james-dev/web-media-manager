import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

/**
 * Master/detail pane state for pages that collapse to one column on phones
 * (list -> detail). The state lives in the router location's `state`, so
 * opening the detail is a real navigation: the browser back button and the
 * iOS swipe-from-edge gesture return to the list.
 *
 * Returns `[showingList, setShowingList]`. `setShowingList(false)` opens the
 * detail (pushes history); `setShowingList(true)` goes back to the list.
 * Outside the phone layout both panes are visible, so it never navigates.
 *
 * Pages opt in with one line and need no route registration.
 */
export function useDetailPane(): [boolean, (showList: boolean) => void] {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const showingList = !(location.state as { detailPane?: boolean } | null)
    ?.detailPane;

  const setShowingList = useCallback(
    (showList: boolean) => {
      if (!isMobile || showList === showingList) return;
      if (showList) {
        // Same as the browser back button, so history stays consistent.
        window.history.back();
      } else {
        navigate(
          { pathname: location.pathname, search: location.search },
          { state: { ...(location.state as object), detailPane: true } }
        );
      }
    },
    [isMobile, showingList, navigate, location]
  );

  return [showingList, setShowingList];
}

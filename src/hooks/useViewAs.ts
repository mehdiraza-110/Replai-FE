import { useEffect, useState } from "react";
import { getViewAs, VIEW_AS_CHANGED_EVENT, type ViewAsTarget } from "../utils/viewAs";

/** The workspace a super admin is currently viewing as (null when not viewing as anyone). Re-renders on change. */
export function useViewAs(): ViewAsTarget | null {
  const [target, setTarget] = useState<ViewAsTarget | null>(() => getViewAs());

  useEffect(() => {
    function sync() {
      const next = getViewAs();
      setTarget((current) => (current?.id === next?.id && current?.name === next?.name ? current : next));
    }

    window.addEventListener(VIEW_AS_CHANGED_EVENT, sync);
    sync();

    return () => window.removeEventListener(VIEW_AS_CHANGED_EVENT, sync);
  }, []);

  return target;
}

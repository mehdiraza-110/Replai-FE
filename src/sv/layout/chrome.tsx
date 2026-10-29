import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface Crumb {
  label: string;
  icon?: LucideIcon;
}

interface ChromeValue {
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
}

const ChromeContext = createContext<ChromeValue>({ crumbs: null, setCrumbs: () => undefined });

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome() {
  return useContext(ChromeContext);
}

/** Sets the breadcrumb shown in the top bar for the lifetime of the calling page. */
export function useSvTitle(crumbs: Crumb[]) {
  const { setCrumbs } = useChrome();
  const key = crumbs.map((crumb) => crumb.label).join("/");

  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs(null);
    // `key` captures the labels; icons never change for a given page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs]);
}

export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("sv.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });

  const update = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem("sv.sidebar.collapsed", next ? "1" : "0");
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  };

  return [collapsed, update];
}

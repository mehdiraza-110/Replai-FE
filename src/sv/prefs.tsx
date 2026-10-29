import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readPreference, useTheme } from "../hooks/useTheme";
import { settingsApi, type Preferences, type PreferencesInput } from "./api/settings";

interface PrefsValue {
  prefs: Preferences | null;
  /** Saves a change and returns the stored result. Rejects with the server's message. */
  save: (input: PreferencesInput) => Promise<Preferences>;
  /** The workspace's chosen colour for its sidebar icon, or null until someone picks one. */
  workspaceColor: string | null;
  setWorkspaceColor: (color: string) => void;
}

const PrefsContext = createContext<PrefsValue>({ prefs: null, save: () => Promise.reject(new Error("Preferences are not loaded.")), workspaceColor: null, setWorkspaceColor: () => {} });

/** Loads the signed-in person's preferences once. Theme stays local-first: the server value only applies when this browser has no choice yet. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [workspaceColor, setWorkspaceColor] = useState<string | null>(null);
  const { setPreference } = useTheme();

  useEffect(() => {
    let cancelled = false;
    settingsApi.preferences().then((loaded) => {
      if (cancelled) return;
      setPrefs(loaded);
      if (readPreference() === "system" && loaded.appearance.theme !== "system") setPreference(loaded.appearance.theme);
    }).catch(() => {});
    settingsApi.workspace().then((w) => { if (!cancelled && w.colorConfigured) setWorkspaceColor(w.color); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async (input: PreferencesInput) => {
    const next = await settingsApi.savePreferences(input);
    setPrefs(next);
    return next;
  }, []);

  const value = useMemo(() => ({ prefs, save, workspaceColor, setWorkspaceColor }), [prefs, save, workspaceColor]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);

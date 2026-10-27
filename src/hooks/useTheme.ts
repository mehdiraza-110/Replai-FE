import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "sendvybe.theme";
const CHANGE_EVENT = "sendvybe:theme-change";
const TRANSITION_CLASS = "theme-transition";
const TRANSITION_MS = 350;

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference = readPreference()): Theme {
  return preference === "system" ? systemTheme() : preference;
}

/** Mirrors the theme onto <html>, which is where HeroUI and styles.css read it from. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

let transitionTimer: number | undefined;

/** Fades colors for a moment while the theme changes, then removes the rule so normal hovers are untouched. */
function applyThemeAnimated(theme: Theme) {
  const root = document.documentElement;
  root.classList.add(TRANSITION_CLASS);
  applyTheme(theme);
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => root.classList.remove(TRANSITION_CLASS), TRANSITION_MS);
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    // Only a "system" preference follows the OS; an explicit choice must not move.
    if (readPreference() === "system") applyThemeAnimated(systemTheme());
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this page view.
    }
    applyThemeAnimated(resolveTheme(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference, theme: resolveTheme(preference), setPreference };
}

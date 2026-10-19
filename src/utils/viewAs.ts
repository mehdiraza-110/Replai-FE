// "View as": a super admin acts inside another workspace. The id lives in sessionStorage (per tab, gone when the
// tab closes) and the request layer sends it as the X-View-As-Workspace header on every API call.
const KEY = "replai.viewAs";
export const VIEW_AS_CHANGED_EVENT = "replai:view-as-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(VIEW_AS_CHANGED_EVENT));
}

export interface ViewAsTarget {
  id: number;
  name: string;
}

export function getViewAs(): ViewAsTarget | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ViewAsTarget) : null;
  } catch {
    return null;
  }
}

export function setViewAs(target: ViewAsTarget) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(target));
    notifyChanged();
  } catch {
    /* sessionStorage can be unavailable (private mode); View as then simply doesn't persist */
  }
}

export function clearViewAs() {
  try {
    window.sessionStorage.removeItem(KEY);
    notifyChanged();
  } catch {
    /* ignore */
  }
}

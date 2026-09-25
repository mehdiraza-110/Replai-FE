import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSystemForPath, type SystemId } from "../constants/systems";

const STORAGE_KEY = "replyos.activeSystem";
const DEFAULT_SYSTEM: SystemId = "responder";

function readStoredSystem(): SystemId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "mailer" || stored === "responder" ? stored : DEFAULT_SYSTEM;
  } catch {
    return DEFAULT_SYSTEM;
  }
}

function writeStoredSystem(system: SystemId) {
  try {
    localStorage.setItem(STORAGE_KEY, system);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.) — the switcher still works, it just won't be remembered.
  }
}

/** The system the sidebar/header should reflect: derived from the current path when it's system-specific, otherwise the last system the user was active in (e.g. while on shared pages like "/" or "/settings"). */
export function useActiveSystem(): SystemId {
  const location = useLocation();
  const pathSystem = getSystemForPath(location.pathname);
  const [lastSystem, setLastSystem] = useState<SystemId>(() => readStoredSystem());

  useEffect(() => {
    if (pathSystem && pathSystem !== lastSystem) {
      setLastSystem(pathSystem);
      writeStoredSystem(pathSystem);
    }
  }, [pathSystem, lastSystem]);

  return pathSystem ?? lastSystem;
}

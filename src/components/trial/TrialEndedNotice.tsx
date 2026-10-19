import { Button } from "@heroui/react";
import { Hourglass, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Full-page notice for members of a workspace whose trial has ended. Logout and switching stay available. */
export function TrialEndedNotice() {
  const { activeWorkspace, logout, refreshPlan, switchWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const others = (user?.workspaces ?? []).filter((w) => w.id !== activeWorkspace?.id);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto mt-16 flex max-w-[460px] flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface p-8 text-center apple-shadow" role="alert">
      <Hourglass aria-hidden className="size-8 text-danger" />
      <h2 className="text-lg font-semibold text-foreground">Your trial has ended</h2>
      <p className="text-sm text-muted">
        The free trial for {activeWorkspace?.name} is over, so its data and tools are unavailable. Contact support to continue.
      </p>
      {others.length > 0 ? (
        <div className="mt-2 grid w-full gap-2">
          <p className="text-[12px] font-medium text-muted">Switch to another workspace</p>
          {others.map((w) => (
            <Button
              isDisabled={busy !== null}
              key={w.id}
              size="sm"
              variant="secondary"
              onClick={() =>
                void run(`ws-${w.id}`, async () => {
                  await switchWorkspace(w.id);
                  navigate("/");
                })
              }
            >
              {busy === `ws-${w.id}` ? "Switching..." : w.name}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button isDisabled={busy !== null} size="sm" variant="secondary" onClick={() => void run("check", refreshPlan)}>
          <RefreshCw className="size-4" />
          Check again
        </Button>
        <Button isDisabled={busy !== null} size="sm" variant="secondary" onClick={() => void run("logout", logout)}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
      {error ? <p className="text-[12px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

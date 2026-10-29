import { useRef, useState, type FormEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { userService } from "../../services/api";
import type { AuthUser } from "../../types";
import { useSvTitle } from "../layout/chrome";
import { Button, Field, PageHeader, SettingsCard } from "../ui";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export function SettingsProfile() {
  useSvTitle([{ label: "Profile" }]);
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState([user?.first_name, user?.last_name].filter(Boolean).join(" "));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"name" | "email" | "avatar" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const savedName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  /** The profile endpoints return a bare user (no workspaces), so merge instead of replacing the session user. */
  const applyUser = (updated: AuthUser) => {
    if (user) updateUser({ ...user, ...updated });
  };

  async function run(kind: "name" | "email" | "avatar", action: () => Promise<void>, success: string) {
    setBusy(kind);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: "ok", text: success });
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    const [first, ...rest] = name.trim().split(/\s+/);
    void run(
      "name",
      async () => applyUser(await userService.updateProfile({ first_name: first, last_name: rest.join(" ") })),
      "Name updated.",
    );
  }

  function saveEmail(event: FormEvent) {
    event.preventDefault();
    void run(
      "email",
      async () => {
        applyUser(await userService.updateProfile({ email: email.trim() }));
        setEmail("");
      },
      "Email updated.",
    );
  }

  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title="Profile" subtitle="Manage your personal details" />

        {notice ? (
          <p role="status" style={{ margin: "0 0 16px", color: notice.tone === "ok" ? "var(--ds-green-text)" : "var(--ds-red-text)" }}>
            {notice.text}
          </p>
        ) : null}

        <SettingsCard title="Your Profile Picture" description="Please choose a photo to upload as your profile picture.">
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}
            onClick={() => fileRef.current?.click()}
            disabled={busy === "avatar"}
          >
            <span
              style={{
                width: 80,
                height: 80,
                borderRadius: 999,
                border: "1px solid var(--ds-border)",
                background: "var(--ds-recess)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {user?.profile_image ? (
                <img src={user.profile_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageIcon className="sv-icon" style={{ width: 24, height: 24 }} aria-hidden />
              )}
            </span>
            <span>
              <div style={{ fontWeight: 500 }}>Upload a Profile Picture</div>
              <div style={{ color: "var(--ds-text-secondary)", fontSize: 12, fontWeight: 450 }}>Choose a photo to upload as your profile picture.</div>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void run("avatar", async () => applyUser(await userService.updateAvatar(file)), "Profile picture updated.");
              event.target.value = "";
            }}
          />
        </SettingsCard>

        <form onSubmit={saveName}>
          <SettingsCard title="Update your Name" description="Update your name to be displayed on your profile.">
            <Field label="Your Name" htmlFor="sv-name">
              <input id="sv-name" className="sv-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </Field>
            <div>
              <Button type="submit" variant="primary" disabled={busy === "name" || !name.trim() || name.trim() === savedName}>
                Update Name
              </Button>
            </div>
          </SettingsCard>
        </form>

        <form onSubmit={saveEmail}>
          <SettingsCard title="Update your Email" description="Update your email address you use to login to your account.">
            <Field label="Current Email" htmlFor="sv-current-email">
              <input id="sv-current-email" className="sv-input" value={user?.email ?? ""} disabled readOnly />
            </Field>
            <Field label="New Email" htmlFor="sv-new-email">
              <input id="sv-new-email" type="email" className="sv-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </Field>
            <div>
              <Button type="submit" variant="primary" disabled={busy === "email" || !email.trim() || email.trim() === user?.email}>
                Update Email Address
              </Button>
            </div>
          </SettingsCard>
        </form>
      </div>
    </div>
  );
}

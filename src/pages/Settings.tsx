import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Avatar, Button, Card, Input } from "@heroui/react";
import { Camera, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { userService } from "../services/api";

const sections = ["Profile", "Security"] as const;
type Section = (typeof sections)[number];

export function Settings() {
  const [activeSection, setActiveSection] = useState<Section>("Profile");

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit border border-border/70 bg-surface p-2">
        {sections.map((section) => (
          <button
            className={(section === activeSection ? "bg-surface-secondary text-foreground" : "text-muted hover:bg-surface-secondary/70 hover:text-foreground") + " flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition"}
            key={section}
            onClick={() => setActiveSection(section)}
            type="button"
          >
            {section}
          </button>
        ))}
      </Card>

      <div className="space-y-5">
        {activeSection === "Profile" ? <ProfileSection /> : <SecuritySection />}
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    setError(null);

    try {
      const updated = await userService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      });
      updateUser(updated);
      setNotice("Profile updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingAvatar(true);
    setNotice(null);
    setError(null);

    try {
      const updated = await userService.updateAvatar(file);
      updateUser(updated);
      setNotice("Avatar updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <Card className="apple-shadow border border-border/70 bg-surface">
      <Card.Header>
        <Card.Title>Profile</Card.Title>
        <Card.Description>Your name, contact details, and avatar.</Card.Description>
      </Card.Header>

      <Card.Content className="space-y-5">
        {notice ? <p className="text-sm font-medium text-success">{notice}</p> : null}
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {user?.profile_image ? <Avatar.Image alt={displayName} src={user.profile_image} /> : null}
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <div>
            <Button isDisabled={isUploadingAvatar} size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Camera className="size-4" />
              {isUploadingAvatar ? "Uploading..." : "Change avatar"}
            </Button>
            <p className="mt-1.5 text-[12px] leading-5 text-muted">PNG, JPG, or WEBP.</p>
            <input accept="image/*" className="sr-only" onChange={handleAvatarChange} ref={fileInputRef} type="file" />
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
          <TextField label="First Name" value={firstName} onChange={setFirstName} />
          <TextField label="Last Name" value={lastName} onChange={setLastName} />
          <TextField label="Email" type="email" value={email} onChange={setEmail} />
          <TextField label="Phone" value={phone} onChange={setPhone} />

          <div className="md:col-span-2">
            <Button isDisabled={isSaving} type="submit">
              <CheckCircle2 className="size-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSaving(true);

    try {
      await userService.changePassword({ currentPassword, newPassword });
      setNotice("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update password");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="apple-shadow border border-border/70 bg-surface">
      <Card.Header>
        <Card.Title>Security</Card.Title>
        <Card.Description>Update the password used to sign in.</Card.Description>
      </Card.Header>

      <Card.Content>
        {notice ? <p className="mb-4 text-sm font-medium text-success">{notice}</p> : null}
        {error ? <p className="mb-4 text-sm font-medium text-danger">{error}</p> : null}

        <form className="grid max-w-[420px] gap-4" onSubmit={changePassword}>
          <TextField label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} />
          <TextField label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
          <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />

          <div>
            <Button isDisabled={isSaving} type="submit">
              <CheckCircle2 className="size-4" />
              {isSaving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}

function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <div className="relative">
        <Input
          className={"agent-field h-10 w-full text-sm text-foreground" + (isPassword ? " pr-10" : "")}
          fullWidth
          type={isPassword && isRevealed ? "text" : type}
          value={value}
          variant="primary"
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword ? (
          <button
            aria-label={isRevealed ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 grid -translate-y-1/2 place-items-center text-muted transition hover:text-foreground"
            onClick={() => setIsRevealed((current) => !current)}
            tabIndex={-1}
            type="button"
          >
            {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    </label>
  );
}

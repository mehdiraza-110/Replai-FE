import { FormEvent, useState } from "react";
import { Button } from "@heroui/react";
import { Building2, User, Users } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { WorkspaceType } from "../types";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

const typeOptions: Array<{ value: WorkspaceType; title: string; description: string; icon: typeof Building2 }> = [
  {
    value: "organization",
    title: "Organization",
    description: "A company or team. You can invite teammates and choose what each of them can use.",
    icon: Users,
  },
  {
    value: "individual",
    title: "Individual",
    description: "Just you. A personal workspace for your own outreach and replies.",
    icon: User,
  },
];

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Give your workspace a name.";
  if (trimmed.length < MIN_NAME_LENGTH) return `The name needs at least ${MIN_NAME_LENGTH} characters.`;
  if (trimmed.length > MAX_NAME_LENGTH) return `The name can be at most ${MAX_NAME_LENGTH} characters.`;
  return "";
}

export function CreateWorkspace() {
  const { activeWorkspace, createWorkspace, isAuthenticated, isReady, logout, switchWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkspaceType>("organization");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: "/create-workspace" }} />;
  }

  if (!isReady) return null;

  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";
  const existingWorkspaces = user?.workspaces ?? [];
  const isFirstWorkspace = existingWorkspaces.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationMessage = validateName(name);
    setNameError(validationMessage);
    if (validationMessage) return;

    setIsSubmitting(true);

    try {
      await createWorkspace({ name: name.trim(), type });
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not create your workspace. Please try again.";
      // Messages about the name itself belong next to the field; everything else is a general form error.
      if (/\bname\b/i.test(message)) setNameError(message);
      else setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSwitch(workspaceId: number) {
    setFormError("");
    setSwitchingId(workspaceId);

    try {
      await switchWorkspace(workspaceId);
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not open that workspace. Please try again.");
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <main className="auth-screen min-h-screen bg-[#F2F3F5] px-4 py-6 text-foreground">
      <section className="auth-panel mx-auto flex w-full max-w-[460px] flex-col border border-border/70 bg-surface px-5 pb-5 pt-7 sm:px-7">
        <div className="mb-3 grid size-10 place-items-center self-center rounded-full bg-[#F0F1F3] text-foreground">
          <Building2 className="size-5" strokeWidth={1.9} />
        </div>

        <h1 className="text-center text-[17px] font-semibold leading-6 text-[#111318]">
          {isFirstWorkspace ? `Welcome, ${firstName}. Let's set up your workspace` : "Create a new workspace"}
        </h1>
        <p className="mx-auto mt-2 max-w-[340px] text-center text-[14px] leading-5 text-[#5D6675]">
          A workspace keeps your domains, mailboxes, agents, and conversations together, separate from everyone else's.
        </p>

        <form className="mt-5 flex w-full flex-col gap-4" noValidate onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="workspace-name">
              Workspace name
            </label>
            <label className={nameError ? "auth-field auth-field--error" : "auth-field"}>
              <Building2 className={nameError ? "size-4 text-[#D92D20]" : "size-4 text-muted"} />
              <input
                aria-describedby={nameError ? "workspace-name-error" : undefined}
                aria-invalid={Boolean(nameError)}
                autoComplete="organization"
                autoFocus
                id="workspace-name"
                maxLength={MAX_NAME_LENGTH + 20}
                placeholder="Acme Outreach"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError("");
                }}
              />
            </label>
            {nameError ? (
              <p className="text-[12px] font-medium leading-4 text-[#D92D20]" id="workspace-name-error" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13px] font-medium text-foreground">What is this workspace for?</legend>
            {typeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === type;

              return (
                <label
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-[14px] border px-3.5 py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
                    isSelected ? "border-accent bg-accent/5" : "border-border/70 hover:bg-surface-secondary/60",
                  ].join(" ")}
                  key={option.value}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    name="workspace-type"
                    type="radio"
                    value={option.value}
                    onChange={() => setType(option.value)}
                  />
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-5 text-foreground">{option.title}</span>
                    <span className="block text-[12px] leading-4 text-muted">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {formError ? (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          ) : null}

          <Button
            className="h-9 w-full rounded-full bg-[#0A84FF] text-[14px] font-semibold text-white shadow-none transition hover:bg-[#0077ED]"
            isDisabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating your workspace..." : "Create workspace"}
          </Button>
        </form>

        {existingWorkspaces.length > 0 ? (
          <div className="mt-5 border-t border-border/70 pt-4">
            <p className="text-[13px] font-medium text-foreground">Or open one you already belong to</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {existingWorkspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-border/70 px-3 py-2 text-left transition hover:bg-surface-secondary/60 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    disabled={switchingId !== null}
                    type="button"
                    onClick={() => handleSwitch(workspace.id)}
                  >
                    <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">{workspace.name}</span>
                    <span className="shrink-0 text-[12px] capitalize text-muted">
                      {switchingId === workspace.id ? "Opening..." : workspace.id === activeWorkspace?.id ? "Current" : workspace.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[13px] leading-5 text-[#5D6675]">
          {existingWorkspaces.length > 0 && activeWorkspace ? (
            <button
              className="font-semibold text-[#0A66CC] transition hover:text-[#004A99] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              type="button"
              onClick={() => navigate("/")}
            >
              Back to {activeWorkspace.name}
            </button>
          ) : (
            <>
              Signed in as {user?.email}.{" "}
              <button
                className="font-semibold text-[#0A66CC] transition hover:text-[#004A99] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                type="button"
                onClick={() => void logout()}
              >
                Log out
              </button>
            </>
          )}
        </p>
      </section>
    </main>
  );
}

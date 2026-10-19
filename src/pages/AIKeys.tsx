import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Card, Input } from "@heroui/react";
import { CheckCircle2, KeyRound, ShieldCheck, TestTube2, Trash2 } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorNotice } from "../components/ui/ErrorNotice";
import { StatusPill } from "../components/ui/StatusPill";
import { useAuth } from "../context/AuthContext";
import { aiKeysService, type AiKeyProviderStatus, type AiKeysOverview, type AiProvider } from "../services/aiKeysApi";

const PROVIDERS: Array<{ id: AiProvider; name: string; hint: string; placeholder: string }> = [
  { id: "openai", name: "OpenAI", hint: "Used for GPT models.", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", hint: "Used for Claude models.", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", hint: "Used for Gemini models.", placeholder: "AIza..." },
];

interface RowFeedback {
  tone: "success" | "danger";
  message: string;
}

function formatDate(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function AIKeys() {
  const { activeWorkspace } = useAuth();
  const canEdit = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
  const [overview, setOverview] = useState<AiKeysOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await aiKeysService.list());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "We could not load your AI keys. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <LoadingState label="Loading AI keys" minHeight={320} />;

  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary px-4 py-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="text-[13px] leading-5 text-muted">
          <p className="font-semibold text-foreground">Your keys, your usage</p>
          <p>
            Agents and AI replies in this workspace use the keys below. Keys are stored encrypted and only a short preview is ever shown.
            {overview?.platformAiEnabled
              ? " This workspace is also allowed to fall back to the platform's shared key when you have not added your own."
              : " Without a key for a provider, AI features that use it will not run."}
          </p>
          {!canEdit ? <p className="mt-1 font-medium text-foreground">Only workspace owners and admins can change these keys.</p> : null}
        </div>
      </div>

      <ErrorNotice error={loadError} />

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            canEdit={canEdit}
            definition={provider}
            key={provider.id}
            status={overview?.providers.find((item) => item.provider === provider.id) ?? null}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  canEdit,
  definition,
  onChanged,
  status,
}: {
  canEdit: boolean;
  definition: (typeof PROVIDERS)[number];
  onChanged: () => Promise<void>;
  status: AiKeyProviderStatus | null;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [feedback, setFeedback] = useState<RowFeedback | null>(null);

  const hasOwnKey = Boolean(status?.configured && status.source !== "platform");
  const usesPlatform = status?.source === "platform";
  const updatedAt = formatDate(status?.updated_at);
  const isBusy = isSaving || isTesting || isRemoving;
  const showForm = canEdit && (isEditing || !hasOwnKey);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = apiKey.trim();

    if (!trimmed) {
      setFeedback({ tone: "danger", message: `Paste your ${definition.name} API key first.` });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await aiKeysService.save(definition.id, trimmed);
      setApiKey("");
      setIsEditing(false);
      await onChanged();
      setFeedback({ tone: "success", message: `${definition.name} key saved and verified.` });
    } catch (error) {
      setFeedback({ tone: "danger", message: error instanceof Error ? error.message : "We could not save this key. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setFeedback(null);

    try {
      const result = await aiKeysService.test(definition.id);
      setFeedback({ tone: result.ok ? "success" : "danger", message: result.message || (result.ok ? "The key works." : "The provider rejected this key.") });
    } catch (error) {
      setFeedback({ tone: "danger", message: error instanceof Error ? error.message : "We could not test this key. Please try again." });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    setFeedback(null);

    try {
      await aiKeysService.remove(definition.id);
      setConfirmRemove(false);
      setIsEditing(false);
      await onChanged();
      setFeedback({ tone: "success", message: `${definition.name} key removed.` });
    } catch (error) {
      setFeedback({ tone: "danger", message: error instanceof Error ? error.message : "We could not remove this key. Please try again." });
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card className="apple-shadow border border-border/70 bg-surface">
      <Card.Content className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
              <KeyRound className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-5 text-foreground">{definition.name}</h2>
              <p className="text-[13px] leading-5 text-muted">{definition.hint}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasOwnKey ? <StatusPill tone="success">Your key connected</StatusPill> : null}
            {usesPlatform ? <StatusPill tone="accent">Platform key in use</StatusPill> : null}
            {!hasOwnKey && !usesPlatform ? <StatusPill tone="warning">Not connected</StatusPill> : null}
          </div>
        </div>

        {hasOwnKey ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2">
            <p className="text-[11px] font-medium text-muted">Saved key</p>
            <p className="mt-0.5 break-all font-mono text-sm font-semibold text-foreground">{status?.preview || "Hidden"}</p>
            {updatedAt ? <p className="mt-0.5 text-[11px] text-muted">Updated {updatedAt}</p> : null}
          </div>
        ) : null}

        {usesPlatform ? (
          <p className="text-[13px] leading-5 text-muted">
            No key of your own is saved, so this workspace uses the platform's shared {definition.name} key. Add your own key to use your own account and limits.
          </p>
        ) : null}

        {showForm ? (
          <form className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={handleSave}>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              {hasOwnKey ? "New API key" : "API key"}
              <Input
                autoComplete="off"
                className="agent-field h-10 w-full text-sm text-foreground"
                fullWidth
                placeholder={definition.placeholder}
                spellCheck={false}
                type="password"
                value={apiKey}
                variant="primary"
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button className="h-10 rounded-full px-4 text-[14px] font-semibold" isDisabled={isBusy || !apiKey.trim()} type="submit">
                {isSaving ? "Verifying..." : hasOwnKey ? "Replace key" : "Save key"}
              </Button>
              {isEditing ? (
                <Button
                  className="h-10 rounded-full px-4 text-[14px]"
                  isDisabled={isBusy}
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey("");
                    setFeedback(null);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        {canEdit && hasOwnKey && !isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={handleTest}>
              <TestTube2 className="size-4" />
              {isTesting ? "Testing..." : "Test key"}
            </Button>
            <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
              Replace key
            </Button>
            {confirmRemove ? (
              <>
                <span className="text-[13px] text-muted">Remove this key?</span>
                <Button isDisabled={isBusy} size="sm" variant="danger" onClick={handleRemove}>
                  {isRemoving ? "Removing..." : "Yes, remove"}
                </Button>
                <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={() => setConfirmRemove(false)}>
                  Keep it
                </Button>
              </>
            ) : (
              <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={() => setConfirmRemove(true)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
        ) : null}

        {feedback ? (
          <p
            className={`flex items-start gap-1.5 text-[13px] font-medium leading-5 ${feedback.tone === "success" ? "text-success" : "text-danger"}`}
            role={feedback.tone === "danger" ? "alert" : "status"}
          >
            {feedback.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}
            {feedback.message}
          </p>
        ) : null}
      </Card.Content>
    </Card>
  );
}

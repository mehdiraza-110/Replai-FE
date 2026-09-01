import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";

import { Button, Card, Chip, Input, Modal, useOverlayState } from "@heroui/react";
import { ArrowRight, CheckCircle2, RefreshCw, TestTube2, X } from "lucide-react";
import { plusVibeService } from "../services/api";
import type { PlusVibeConnection } from "../services/api";

type LogoProps = {
  className?: string;
  "aria-hidden"?: boolean;
};

type Integration = {
  name: string;
  description: string;
  action: string;
  status?: "Connected" | "Configured" | "Disconnected" | "Available" | "Error";
  logo: ComponentType<LogoProps>;
};

const otherIntegrations: Integration[] = [
  {
    name: "Gmail",
    description: "Connect your Google Workspace account.",
    action: "Connect Gmail",
    status: "Available",
    logo: GmailLogo,
  },
  {
    name: "Outlook",
    description: "Connect your Microsoft 365 or Outlook account.",
    action: "Connect Outlook",
    status: "Available",
    logo: OutlookLogo,
  },
  {
    name: "Smartlead",
    description: "Connect your Smartlead email automation account.",
    action: "Connect Smartlead",
    status: "Available",
    logo: SmartleadLogo,
  },
  {
    name: "Instantly",
    description: "Connect your Instantly email automation account.",
    action: "Connect Instantly",
    status: "Available",
    logo: InstantlyLogo,
  },
];

export function Integrations() {
  const [connection, setConnection] = useState<PlusVibeConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plusVibeModal = useOverlayState({});

  useEffect(() => {
    let isActive = true;

    plusVibeService
      .getConnection()
      .then((data) => {
        if (!isActive) return;
        setConnection(data);
      })
      .catch((requestError: Error) => {
        if (!isActive) return;
        setError(requestError.message || "Unable to load PlusVibe connection");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const plusVibeIntegration = useMemo<Integration>(() => ({
    name: "PlusVibe",
    description: "Primary outbound campaign source for replies, lead context, and send-back actions.",
    action: connection?.id ? "Manage PlusVibe" : "Connect PlusVibe",
    status: connection?.connectionStatus || "Disconnected",
    logo: PlusVibeLogo,
  }), [connection]);

  async function refreshPlusVibe() {
    setIsRefreshing(true);
    setNotice(null);
    setError(null);

    try {
      const data = await plusVibeService.refresh();
      setConnection(data);
      setNotice("PlusVibe sync refreshed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh PlusVibe");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1180px] space-y-5">
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {notice ? <p className="text-sm font-medium text-success">{notice}</p> : null}

        <PlusVibePanel
          connection={connection}
          integration={plusVibeIntegration}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onManage={plusVibeModal.open}
          onRefresh={refreshPlusVibe}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {otherIntegrations.map((integration) => (
            <IntegrationCard integration={integration} key={integration.name} />
          ))}
        </div>
      </div>

      <PlusVibeModal
        connection={connection}
        state={plusVibeModal}
        onSaved={(data) => {
          setConnection(data);
          setNotice("PlusVibe connection saved.");
          setError(null);
        }}
        onError={setError}
      />
    </>
  );
}

function PlusVibePanel({
  connection,
  integration,
  isLoading,
  isRefreshing,
  onManage,
  onRefresh,
}: {
  connection: PlusVibeConnection | null;
  integration: Integration;
  isLoading: boolean;
  isRefreshing: boolean;
  onManage: () => void;
  onRefresh: () => void;
}) {
  const Logo = integration.logo;
  const canRefresh = Boolean(connection?.id);
  const webhookEndpoint = connection?.webhookUrl || plusVibeService.getWebhookEndpoint();

  return (
    <Card className="apple-shadow border border-border/70 bg-surface">
      <Card.Header className="border-b border-border/70">
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Logo className="mt-0.5 size-9 shrink-0" aria-hidden />
            <div>
              <Card.Title className="text-base">{integration.name}</Card.Title>
              <Card.Description className="mt-1 max-w-[72ch]">{integration.description}</Card.Description>
            </div>
          </div>
          <IntegrationStatus status={integration.status} />
        </div>
      </Card.Header>

      <Card.Content className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <SkeletonMetric key={index} />)
            ) : (
              <>
                <Metric label="Workspace" value={connection?.workspaceName || connection?.workspaceId || "Not configured"} />
                <Metric label="API Status" value={connection?.apiStatus || "Not configured"} />
                <Metric label="Webhook Status" value={connection?.webhookStatus || "Not configured"} />
                <Metric label="Webhook Event" value={connection?.webhookEventType || "ALL_EMAIL_REPLIES"} />
                <Metric label="Connected Inboxes" value={String(connection?.connectedInboxes ?? 0)} />
                <Metric label="Synced Campaigns" value={String(connection?.syncedCampaigns ?? 0)} />
                <Metric label="Last Sync" value={formatDate(connection?.lastSync)} />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-secondary p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Webhook endpoint</p>
            <p className="mt-1 break-all text-[12px] leading-5 text-muted">{webhookEndpoint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm" onClick={onManage}>
              {integration.action}
              <ArrowRight className="size-4" />
            </Button>
            <Button isDisabled={!canRefresh || isRefreshing} size="sm" variant="secondary" onClick={onRefresh}>
              <RefreshCw className="size-4" />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function PlusVibeModal({
  connection,
  onError,
  onSaved,
  state,
}: {
  connection: PlusVibeConnection | null;
  onError: (message: string | null) => void;
  onSaved: (connection: PlusVibeConnection) => void;
  state: ReturnType<typeof useOverlayState>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyScope, setApiKeyScope] = useState<"account" | "workspace">("workspace");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [webhookEventType, setWebhookEventType] = useState("ALL_EMAIL_REPLIES");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isOpen) return;

    setApiKey("");
    setApiKeyScope(connection?.apiKeyScope || "workspace");
    setWorkspaceId(connection?.workspaceId || "");
    setWorkspaceName(connection?.workspaceName || "");
    setWebhookEventType(connection?.webhookEventType || "ALL_EMAIL_REPLIES");
    setWebhookUrl(connection?.webhookUrl || plusVibeService.getWebhookEndpoint());
    setLocalError(null);
  }, [connection, state.isOpen]);

  async function saveConnection() {
    setIsSaving(true);
    setLocalError(null);

    try {
      const data = await plusVibeService.saveConnection({
        apiKey,
        apiKeyScope,
        workspaceId,
        workspaceName,
        webhookEventType,
        webhookUrl,
      });
      onSaved(data);
      state.close();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save PlusVibe connection";
      setLocalError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function testConnection() {
    setIsTesting(true);
    setLocalError(null);

    try {
      const data = await plusVibeService.testConnection({ apiKey, workspaceId });
      onSaved(data);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to test PlusVibe connection";
      setLocalError(message);
      onError(message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(760px,calc(100vw-32px))]" placement="center" scroll="inside" size="lg">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">PlusVibe connection</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">Connect reply ingestion, webhook status, and send-back access through backend-held credentials.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="thin-scrollbar max-h-[72vh] overflow-y-auto px-5 py-5">
              <div className="grid items-start gap-4 md:grid-cols-2">
                <TextField
                  label="API Key"
                  placeholder={connection?.apiKeyConfigured ? "Leave blank to keep existing key" : "Paste PlusVibe API key"}
                  type="password"
                  value={apiKey}
                  onChange={setApiKey}
                />
                <SelectField
                  label="API Key Scope"
                  options={[
                    { label: "Workspace API key", value: "workspace" },
                    { label: "Account API key", value: "account" },
                  ]}
                  value={apiKeyScope}
                  onChange={(value) => setApiKeyScope(value as "account" | "workspace")}
                />
                <TextField label="Workspace ID" placeholder="65099a0dd96fae8ab61130c0" value={workspaceId} onChange={setWorkspaceId} />
                <TextField label="Workspace Name" placeholder="PLWH Sales" value={workspaceName} onChange={setWorkspaceName} />
                <SelectField
                  label="Webhook Event Type"
                  options={[
                    { label: "All Email Replies", value: "ALL_EMAIL_REPLIES" },
                    { label: "First Email Replies", value: "FIRST_EMAIL_REPLIES" },
                    { label: "All Positive Replies", value: "ALL_POSITIVE_REPLIES" },
                  ]}
                  value={webhookEventType}
                  onChange={setWebhookEventType}
                />
                <TextField label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} />

                <div className="rounded-xl bg-surface-secondary p-3 md:col-span-2">
                  <p className="text-sm font-semibold text-foreground">Configure this URL in PlusVibe</p>
                  <p className="mt-1 break-all text-[12px] leading-5 text-muted">{plusVibeService.getWebhookEndpoint()}</p>
                  <p className="mt-2 text-[12px] leading-5 text-muted">Use event type <span className="font-semibold text-foreground">All Email Replies</span>. Workspace ID is the PlusVibe workspace identifier, not the sender email address.</p>
                </div>

                {localError ? <p className="text-sm font-medium text-danger md:col-span-2">{localError}</p> : null}
              </div>
            </Modal.Body>

            <Modal.Footer className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isTesting || (!apiKey && !connection?.apiKeyConfigured) || !workspaceId} size="sm" variant="secondary" onClick={testConnection}>
                <TestTube2 className="size-4" />
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button isDisabled={isSaving} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
                <Button isDisabled={isSaving || (!apiKey && !connection?.apiKeyConfigured) || !workspaceId} size="sm" onClick={saveConnection}>
                  <CheckCircle2 className="size-4" />
                  {isSaving ? "Saving..." : "Save PlusVibe"}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Logo = integration.logo;

  return (
    <Card className="min-h-[172px] border border-border/70 bg-surface p-5 shadow-[0_1px_3px_color-mix(in_oklch,var(--foreground)_12%,transparent)]">
      <Card.Content className="flex h-full flex-col p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="size-8 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-normal text-foreground">{integration.name}</h2>
              <p className="mt-2 max-w-[34ch] text-sm leading-5 text-muted">{integration.description}</p>
            </div>
          </div>
          <IntegrationStatus status={integration.status} />
        </div>

        <Button
          className="mt-auto h-[34px] w-full rounded-full px-4 text-[14px] font-semibold leading-none"
          isDisabled
          size="sm"
          variant="secondary"
        >
          {integration.action}
          <ArrowRight className="size-4" />
        </Button>
      </Card.Content>
    </Card>
  );
}

function IntegrationStatus({ status }: { status?: Integration["status"] }) {
  const tone = status === "Connected" ? "success" : status === "Error" ? "danger" : status === "Configured" ? "warning" : "default";

  return (
    <Chip className="shrink-0" color={tone} size="sm" variant="soft">
      <span className="flex items-center gap-1">
        {status === "Connected" ? <CheckCircle2 className="size-3.5" /> : null}
        {status || "Available"}
      </span>
    </Chip>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-secondary px-3 py-2">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="rounded-xl bg-surface-secondary px-3 py-3">
      <div className="h-3 w-20 animate-pulse rounded bg-surface-tertiary" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-surface-tertiary" />
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <select
        className="agent-field h-10 w-full px-3 text-sm text-foreground outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Input
        className="agent-field h-10 w-full text-sm text-foreground"
        fullWidth
        placeholder={placeholder}
        type={type}
        value={value}
        variant="primary"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function PlusVibeLogo(props: LogoProps) {
  return (
    <img src="/plusvibe.svg" alt="" {...props} />
  );
}

function GmailLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <path d="M5 9.5C5 8.1 6.1 7 7.5 7H9L16 12.5L23 7H24.5C25.9 7 27 8.1 27 9.5V24.5H22V14.8L16 19.5L10 14.8V24.5H5V9.5Z" fill="#F2F2F2" />
      <path d="M5 9.5L10 13.4V24.5H5V9.5Z" fill="#4285F4" />
      <path d="M22 13.4L27 9.5V24.5H22V13.4Z" fill="#34A853" />
      <path d="M9 7L16 12.5L23 7L16 18.2L9 7Z" fill="#EA4335" />
      <path d="M5 9.5C5 8.1 6.1 7 7.5 7H9L16 18.2L5 9.5Z" fill="#FBBC05" />
      <path d="M27 9.5L16 18.2L23 7H24.5C25.9 7 27 8.1 27 9.5Z" fill="#EA4335" />
    </svg>
  );
}

function OutlookLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect x="12" y="7" width="15" height="18" rx="2" fill="#0A5BD3" />
      <path d="M13 9H26V13H13V9Z" fill="#41A5EE" />
      <path d="M13 14H26V18H13V14Z" fill="#2B7CD3" />
      <path d="M13 19H26V23H13V19Z" fill="#185ABD" />
      <rect x="5" y="10" width="14" height="14" rx="2" fill="#0078D4" />
      <path d="M8.5 17C8.5 14.8 9.8 13.2 12 13.2C14.2 13.2 15.5 14.8 15.5 17C15.5 19.2 14.2 20.8 12 20.8C9.8 20.8 8.5 19.2 8.5 17ZM10.5 17C10.5 18.3 11 19.1 12 19.1C13 19.1 13.5 18.3 13.5 17C13.5 15.7 13 14.9 12 14.9C11 14.9 10.5 15.7 10.5 17Z" fill="white" />
    </svg>
  );
}

function SmartleadLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect x="4" y="4" width="24" height="24" rx="7" fill="#7457F6" />
      <path d="M10 11.5L17.5 8.5V23.5L10 20.5V11.5Z" fill="white" />
      <path d="M19.5 11.5H22.5V20.5H19.5V11.5Z" fill="white" />
      <path d="M8.2 14.2H11.2V17.8H8.2C7.5 17.8 7 17.3 7 16.6V15.4C7 14.7 7.5 14.2 8.2 14.2Z" fill="white" />
    </svg>
  );
}

function InstantlyLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="13" fill="#0A68FF" />
      <path d="M17.2 7.5L9.8 17.2H15L13.9 24.5L22.3 13.8H16.8L17.2 7.5Z" fill="white" />
    </svg>
  );
}

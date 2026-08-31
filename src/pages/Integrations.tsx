import type { ComponentType, SVGProps } from "react";

import { Button, Card, Chip } from "@heroui/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type LogoProps = SVGProps<SVGSVGElement>;

type Integration = {
  name: string;
  description: string;
  action: string;
  status?: "Connected" | "Available";
  logo: ComponentType<LogoProps>;
};

const integrations: Integration[] = [
  {
    name: "PlusVibe",
    description: "Connect your primary outbound campaign source.",
    action: "Manage PlusVibe",
    status: "Connected",
    logo: PlusVibeLogo,
  },
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
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard integration={integration} key={integration.name} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Logo = integration.logo;
  const isConnected = integration.status === "Connected";

  return (
    <Card className="min-h-[172px] border border-border/70 bg-surface p-5 shadow-[0_1px_3px_color-mix(in_oklch,var(--foreground)_12%,transparent)]">
      <Card.Content className="flex h-full flex-col p-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="size-8 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-normal text-foreground">{integration.name}</h2>
              <p className="mt-2 max-w-[34ch] text-sm leading-5 text-muted">{integration.description}</p>
            </div>
          </div>
          {integration.status ? (
            <Chip
              className="shrink-0"
              color={isConnected ? "success" : "default"}
              size="sm"
              variant="soft"
            >
              <span className="flex items-center gap-1">
                {isConnected ? <CheckCircle2 className="size-3.5" /> : null}
                {integration.status}
              </span>
            </Chip>
          ) : null}
        </div>

        <Button
          className="mt-auto h-[34px] w-full rounded-full px-4 text-[14px] font-semibold leading-none"
          size="sm"
        >
          {integration.action}
          <ArrowRight className="size-4" />
        </Button>
      </Card.Content>
    </Card>
  );
}

function PlusVibeLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect width="32" height="32" rx="10" fill="#0A84FF" />
      <path d="M9 17.2L14.2 22.4L23.5 10.4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

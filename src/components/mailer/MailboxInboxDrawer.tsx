import { useEffect, useState } from "react";
import { Button, Drawer, Spinner, Tooltip } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, Inbox, Mail, RefreshCw, X } from "lucide-react";
import { mailboxService } from "../../services/api";
import type { Mailbox, MailboxInboxMessage } from "../../types";

/**
 * App-native inbox for a single mailbox (SES receiving, not a real IMAP/SMTP mailbox —
 * see PlusVibe-Plan.md 1B). Shows every outbound send and inbound reply for that address.
 */
export function MailboxInboxDrawer({ mailbox, onClose }: { mailbox: Mailbox | null; onClose: () => void }) {
  const [messages, setMessages] = useState<MailboxInboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!mailbox) {
      setMessages([]);
      setSelectedId(null);
      return;
    }
    void load(mailbox.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailbox?.id]);

  async function load(mailboxId: number) {
    setIsLoading(true);
    setError(null);
    try {
      const page = await mailboxService.messages(mailboxId, { limit: 50 });
      setMessages(page.items);
      setSelectedId(page.items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load messages");
    } finally {
      setIsLoading(false);
    }
  }

  const selected = messages.find((message) => message.id === selectedId) ?? null;

  return (
    <Drawer.Root isOpen={Boolean(mailbox)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full max-w-[92vw] flex-col" style={{ width: "64vw", minWidth: "560px" }}>
            {mailbox ? (
              <>
                <Drawer.Header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-default-100 text-foreground">
                      <Inbox className="size-3.5" />
                    </span>
                    <Drawer.Heading className="text-[14px] font-semibold text-foreground">{mailbox.email}</Drawer.Heading>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip delay={200}>
                      <Tooltip.Trigger>
                        <button
                          aria-label="Refresh inbox"
                          className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                          disabled={isLoading}
                          onClick={() => load(mailbox.id)}
                          type="button"
                        >
                          {isLoading ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>Refresh</Tooltip.Content>
                    </Tooltip>
                    <Drawer.CloseTrigger className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground">
                      <X className="size-4" />
                    </Drawer.CloseTrigger>
                  </div>
                </Drawer.Header>

                <Drawer.Body className="flex-1 overflow-hidden p-0">
                  {error ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-[13px] text-danger">{error}</p>
                      <Button onPress={() => load(mailbox.id)} size="sm" variant="secondary">Retry</Button>
                    </div>
                  ) : isLoading && messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                      <Mail className="size-8 text-muted" />
                      <p className="text-[13px] text-muted">No messages yet for this mailbox.</p>
                    </div>
                  ) : (
                    <div className="flex h-full">
                      <div className="w-[280px] shrink-0 overflow-y-auto border-r border-border/70">
                        {messages.map((message) => (
                          <button
                            className={`flex w-full flex-col gap-1 border-b border-border/50 px-4 py-3 text-left transition hover:bg-surface-secondary ${
                              selectedId === message.id ? "bg-surface-secondary" : ""
                            }`}
                            key={message.id}
                            onClick={() => setSelectedId(message.id)}
                            type="button"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] text-muted">
                              {message.direction === "outbound" ? (
                                <ArrowUpRight className="size-3 text-accent" />
                              ) : (
                                <ArrowDownLeft className="size-3 text-success" />
                              )}
                              <span className="truncate">{message.direction === "outbound" ? message.toAddress : message.fromAddress}</span>
                            </div>
                            <p className="truncate text-[13px] font-medium text-foreground">{message.subject || "(no subject)"}</p>
                            <p className="text-[11px] text-muted">{new Date(message.createdAt).toLocaleString()}</p>
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-y-auto p-5">
                        {selected ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-[15px] font-semibold text-foreground">{selected.subject || "(no subject)"}</p>
                              <p className="mt-1 text-[12px] text-muted">
                                {selected.direction === "outbound" ? "To" : "From"}: {selected.direction === "outbound" ? selected.toAddress : selected.fromAddress}
                                {" · "}
                                {new Date(selected.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {/* Only the plain-text body is rendered — inbound email HTML is
                                attacker-controlled and rendering it raw would be an XSS risk. */}
                            <p className="whitespace-pre-wrap text-[13px] leading-6 text-foreground">{selected.bodyText}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Drawer.Body>
              </>
            ) : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

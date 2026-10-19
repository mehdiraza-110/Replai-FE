import { Button } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AdminModal, ErrorBanner } from "../admin/AdminModal";
import { domainService } from "../../services/api";
import { orderService, type CreateOrderPayload, type OrderRequest, type OrderType } from "../../services/orderApi";
import type { Domain } from "../../types";
import { DomainChipInput } from "./DomainChipInput";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: OrderRequest) => void;
}

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {children}
      </label>
      {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function NewOrderModal({ isOpen, onClose, onCreated }: NewOrderModalProps) {
  const [type, setType] = useState<OrderType>("domains");
  const [quantity, setQuantity] = useState("1");
  const [preferred, setPreferred] = useState<string[]>([]);
  const [perDomain, setPerDomain] = useState("2");
  const [namesText, setNamesText] = useState("");
  const [notes, setNotes] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType("domains");
    setQuantity("1");
    setPreferred([]);
    setPerDomain("2");
    setNamesText("");
    setNotes("");
    setSelectedIds([]);
    setError(null);
    setTouched(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || type !== "mailboxes" || domains.length > 0) return;
    let active = true;
    setDomainsLoading(true);
    setDomainsError(null);
    domainService
      .list({ page: 1, limit: 100 })
      .then((page) => active && setDomains(page.items))
      .catch((e: unknown) => active && setDomainsError(e instanceof Error ? e.message : "Could not load your domains."))
      .finally(() => active && setDomainsLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, type, domains.length]);

  const names = useMemo(() => namesText.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean), [namesText]);
  const qty = Number(quantity);
  const per = Number(perDomain);

  const errors = {
    quantity: !Number.isInteger(qty) || qty < 1 ? "Enter a whole number of at least 1." : qty > 1000 ? "That is a lot. Add a note or request fewer at a time." : null,
    perDomain: type === "mailboxes" && (!Number.isInteger(per) || per < 1 || per > 50) ? "Enter a number between 1 and 50." : null,
  };
  const hasErrors = Boolean(errors.quantity || errors.perDomain);

  async function submit() {
    setTouched(true);
    if (hasErrors) return;

    const details: NonNullable<CreateOrderPayload["details"]> = {};
    if (type === "domains" && preferred.length) details.preferredDomains = preferred;
    if (type === "mailboxes") {
      details.mailboxesPerDomain = per;
      if (names.length) details.mailboxNames = names;
      if (selectedIds.length) details.domainIds = selectedIds;
    }
    if (notes.trim()) details.notes = notes.trim();

    setIsBusy(true);
    setError(null);
    try {
      const created = await orderService.create({ type, quantity: qty, ...(Object.keys(details).length ? { details } : {}) });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not submit your request. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AdminModal
      description="Tell us what you need. Our team reviews the request, provisions it, and it appears in your workspace."
      footer={
        <>
          <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button isDisabled={isBusy} size="sm" onClick={() => void submit()}>
            {isBusy ? "Submitting..." : "Submit request"}
          </Button>
        </>
      }
      isOpen={isOpen}
      title="New request"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div aria-label="Request type" className="grid grid-cols-2 gap-1 rounded-xl bg-default-100 p-1" role="tablist">
          {(["domains", "mailboxes"] as const).map((value) => (
            <button
              aria-selected={type === value}
              className={`h-8 rounded-lg text-[13px] font-medium transition ${
                type === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
              key={value}
              role="tab"
              type="button"
              onClick={() => setType(value)}
            >
              {value === "domains" ? "Domains" : "Mailboxes"}
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="order-quantity" hint={type === "domains" ? "How many new domains you need." : "How many new mailboxes you need in total."}>
            Quantity
          </Label>
          <input
            aria-invalid={touched && errors.quantity ? true : undefined}
            className={fieldClass}
            id="order-quantity"
            inputMode="numeric"
            min={1}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {touched && errors.quantity ? <p className="mt-1 text-[12px] text-danger">{errors.quantity}</p> : null}
        </div>

        {type === "domains" ? (
          <div>
            <Label htmlFor="order-preferred" hint="Optional. Names you would like us to try. Press Enter or comma after each one.">
              Preferred domains
            </Label>
            <DomainChipInput id="order-preferred" max={50} values={preferred} onChange={setPreferred} />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="order-per-domain" hint="How many mailboxes to create on each domain (1-50).">
                Mailboxes per domain
              </Label>
              <input
                aria-invalid={touched && errors.perDomain ? true : undefined}
                className={fieldClass}
                id="order-per-domain"
                inputMode="numeric"
                max={50}
                min={1}
                type="number"
                value={perDomain}
                onChange={(e) => setPerDomain(e.target.value)}
              />
              {touched && errors.perDomain ? <p className="mt-1 text-[12px] text-danger">{errors.perDomain}</p> : null}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-foreground">Domains to use</legend>
              <p className="mb-1.5 text-[12px] text-muted">Optional. Pick from the domains already in your workspace, or leave empty and we will choose.</p>
              {domainsLoading ? (
                <p className="text-[13px] text-muted">Loading your domains...</p>
              ) : domainsError ? (
                <ErrorBanner message={domainsError} />
              ) : domains.length === 0 ? (
                <p className="rounded-xl bg-default-100 px-3 py-2 text-[13px] text-muted">You have no domains yet. Request domains first, or leave this empty.</p>
              ) : (
                <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-border p-1.5">
                  {domains.map((domain) => (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-foreground hover:bg-default-100" key={domain.id}>
                      <input
                        checked={selectedIds.includes(domain.id)}
                        className="size-4 accent-[var(--color-accent,currentColor)]"
                        type="checkbox"
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, domain.id] : prev.filter((id) => id !== domain.id)))
                        }
                      />
                      <span className="truncate">{domain.domain}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div>
              <Label htmlFor="order-names" hint="Optional. Preferred mailbox names (for example: sam, alex). One per line or comma separated.">
                Mailbox names
              </Label>
              <textarea
                className="min-h-[72px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                id="order-names"
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="order-notes" hint="Optional. Anything else our team should know.">
            Notes
          </Label>
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            id="order-notes"
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    </AdminModal>
  );
}

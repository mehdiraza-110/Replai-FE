import { Button, Card, Chip, Input, ListBox, Select } from "@heroui/react";
import { ArrowRight, CheckCircle2, Plus, Route, Settings2 } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { leadRoutingService } from "../services/api";

export function LeadRouting() {
  const destinations = leadRoutingService.listDestinations();
  const rules = leadRoutingService.listRules();

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-3">
          {destinations.map((destination) => {
            const isConnected = destination.status === "Connected";

            return (
              <Card className="border border-border/70 bg-surface p-5" key={destination.name}>
                <Card.Content className="flex min-h-[178px] flex-col p-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Route className="size-5" />
                    </div>
                    <Chip color={isConnected ? "success" : "default"} size="sm" variant="soft">
                      <span className="flex items-center gap-1">
                        {isConnected ? <CheckCircle2 className="size-3.5" /> : null}
                        {destination.status}
                      </span>
                    </Chip>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-base font-semibold tracking-normal text-foreground">{destination.name}</h2>
                    <p className="mt-2 text-sm leading-5 text-muted">{destination.description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
                    <span>{destination.destinationType}</span>
                    <span>{destination.leadsForwarded} forwarded</span>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </section>

        <Card className="apple-shadow border border-border/70 bg-surface">
          <Card.Header className="flex-row items-center justify-between gap-4">
            <div>
              <Card.Title>Forwarding Rules</Card.Title>
              <Card.Description>Send leads to connected platforms when they match admin-defined criteria.</Card.Description>
            </div>
            <Button size="sm"><Plus className="size-4" />New Rule</Button>
          </Card.Header>
          <Card.Content className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-y border-border/70 text-xs text-muted">
                <tr>
                  {["Rule", "Criteria", "Destination", "Status", "Forwarded Today", "Last Run", "Action"].map((header) => (
                    <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr className="border-b border-border/60 last:border-0" key={rule.name}>
                    <td className="px-4 py-4 font-semibold text-foreground">{rule.name}</td>
                    <td className="px-4 py-4 text-muted">{rule.criteria}</td>
                    <td className="px-4 py-4 text-foreground">{rule.destination}</td>
                    <td className="px-4 py-4"><StatusPill tone={rule.status === "Active" ? "success" : "default"}>{rule.status}</StatusPill></td>
                    <td className="px-4 py-4 text-muted">{rule.forwardedToday}</td>
                    <td className="px-4 py-4 text-muted">{rule.lastRun}</td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="secondary"><Settings2 className="size-4" />Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>

      <Card className="h-fit border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Route Builder</Card.Title>
          <Card.Description>Example criteria for forwarding qualified leads to GoHighLevel.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <SelectField label="Destination" options={["GoHighLevel", "HubSpot", "Custom Webhook"]} value="GoHighLevel" />
          <SelectField label="Intent" options={["Meeting Request", "Question", "Interested", "Objection"]} value="Meeting Request" />
          <Input className="agent-field h-10 w-full text-sm text-foreground" fullWidth readOnly value="Confidence above 90%" variant="primary" />
          <Input className="agent-field h-10 w-full text-sm text-foreground" fullWidth readOnly value="Sales stage is Meeting or Evaluation" variant="primary" />
        </Card.Content>
        <Card.Footer className="justify-end">
          <Button size="sm">
            Save Rule
            <ArrowRight className="size-4" />
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

function SelectField({ label, options, value }: { label: string; options: string[]; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Select aria-label={label} className="agent-select w-full" fullWidth selectedKey={value} variant="primary">
        <Select.Trigger className="h-10 px-3 text-sm text-foreground">
          <Select.Value>{value}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label={label} items={options.map((option) => ({ id: option, name: option }))}>
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.name}>
                <ListBox.ItemIndicator />
                {option.name}
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  );
}

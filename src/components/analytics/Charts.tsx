import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function BarChart() {
  const data = [
    { day: "01", sales: 29 },
    { day: "02", sales: 52 },
    { day: "03", sales: 34 },
    { day: "04", sales: 17 },
    { day: "05", sales: 43 },
    { day: "06", sales: 23 },
    { day: "07", sales: 25 },
    { day: "08", sales: 30 },
    { day: "09", sales: 9 },
    { day: "10", sales: 43 },
    { day: "11", sales: 37 },
    { day: "12", sales: 31 },
  ];

  return (
    <div className="h-[136px] w-full">
      <ResponsiveContainer className="[&_.recharts-surface]:outline-none" height="100%" width="100%">
        <RechartsBarChart
          accessibilityLayer
          data={data}
          margin={{ top: 12, right: 2, left: -12, bottom: -4 }}
        >
          <CartesianGrid stroke="var(--separator)" strokeDasharray="0" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="day"
            interval={0}
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 500 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[0, 60]}
            ticks={[0, 20, 40, 60]}
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            width={38}
          />
          <Tooltip
            content={({ label, payload }) => (
              <div className="min-w-[118px] rounded-xl border border-border/70 bg-surface px-3 py-2 text-[11px] apple-shadow">
                <div className="mb-1 font-semibold text-foreground">{label}</div>
                {payload?.map((item) => (
                  <div className="flex items-center justify-between gap-6" key={item.name}>
                    <span className="flex items-center gap-1.5 text-muted">
                      <i className="size-1.5 rounded-full bg-accent" />
                      sales
                    </span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
            cursor={{ fill: "color-mix(in oklch, var(--foreground) 5%, transparent)" }}
          />
          <Bar animationDuration={450} barSize={14} dataKey="sales" fill="var(--accent)" radius={[7, 7, 7, 7]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChart() {
  const data = [
    { month: "Jan", organic: 2, paid: 1 },
    { month: "Feb", organic: 15, paid: 10 },
    { month: "Mar", organic: 8, paid: 12 },
    { month: "Apr", organic: 14, paid: 14 },
    { month: "May", organic: 15, paid: 8 },
    { month: "Jun", organic: 8, paid: 9 },
    { month: "Jul", organic: 18, paid: 12 },
    { month: "Aug", organic: 18, paid: 10 },
    { month: "Sep", organic: 20, paid: 5 },
    { month: "Oct", organic: 17, paid: 12 },
    { month: "Nov", organic: 22, paid: 18 },
    { month: "Dec", organic: 15, paid: 9 },
  ];

  return (
    <div className="h-[136px] w-full">
      <ResponsiveContainer className="[&_.recharts-surface]:outline-none" height="100%" width="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 2, left: -10, bottom: -4 }}>
          <CartesianGrid stroke="var(--separator)" strokeDasharray="0" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="month"
            interval={0}
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 500 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[0, 25]}
            ticks={[0, 5, 10, 15, 20]}
            tickFormatter={(value) => (value === 0 ? "0" : `${value}k`)}
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={({ label, payload }) => (
              <div className="min-w-[132px] rounded-xl border border-border/70 bg-surface px-3 py-2 text-[11px] apple-shadow">
                <div className="mb-1 font-semibold text-foreground">{label}</div>
                {payload?.map((item) => (
                  <div className="flex items-center justify-between gap-4" key={String(item.dataKey)}>
                    <span className="flex items-center gap-1.5 text-muted">
                      <i
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span className="font-semibold text-foreground">{item.value}k</span>
                  </div>
                ))}
              </div>
            )}
            cursor={false}
          />
          <Line animationDuration={650} dataKey="organic" dot={false} name="Organic" stroke="var(--accent)" strokeWidth={2} type="linear" />
          <Line animationDuration={650} dataKey="paid" dot={false} name="Paid Ads" stroke="color-mix(in oklch, var(--accent) 58%, white)" strokeWidth={2} type="linear" />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart() {
  return (
    <div className="relative size-32 rounded-full bg-[conic-gradient(var(--accent)_0_42%,color-mix(in_oklch,var(--success)_70%,transparent)_42%_64%,color-mix(in_oklch,var(--warning)_70%,transparent)_64%_82%,color-mix(in_oklch,var(--foreground)_14%,transparent)_82%_100%)]">
      <div className="absolute inset-5 rounded-full bg-surface" />
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="text-2xl font-semibold text-foreground">96%</span>
        <span className="absolute mt-12 text-[11px] font-medium text-muted">confident</span>
      </div>
    </div>
  );
}

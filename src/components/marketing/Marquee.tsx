import type { ReactNode } from "react";

export function Marquee({ children, reverse, duration = 50 }: { children: ReactNode; reverse?: boolean; duration?: number }) {
  return (
    <div className="mkt-marquee">
      <div className={`mkt-marquee-track ${reverse ? "mkt-marquee-track--reverse" : ""}`} style={{ animationDuration: `${duration}s` }}>
        <div className="mkt-marquee-group">{children}</div>
        <div aria-hidden="true" className="mkt-marquee-group">
          {children}
        </div>
      </div>
    </div>
  );
}

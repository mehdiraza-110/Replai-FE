import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import "lenis/dist/lenis.css";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      options={{
        duration: 1.1,
        smoothWheel: true,
        touchMultiplier: 1.1,
        anchors: { offset: -96 },
      }}
      root
    >
      {children}
    </ReactLenis>
  );
}

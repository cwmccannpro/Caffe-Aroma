"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Fades and lifts its children in once, the first time they scroll into view. */
export default function Reveal({ children, as, delay = 0, className = "", style }: { children: ReactNode; as?: "div" | "li" | "section"; delay?: number; className?: string; style?: CSSProperties }) {
  // Only plain block tags are allowed; the cast keeps the ref/JSX typing simple (we only ever call setAttribute on it).
  const Tag = (as ?? "div") as "div";
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute("data-in", "");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

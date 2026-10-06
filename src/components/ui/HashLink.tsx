"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * A link to a section of the home page (`/#tonight`).
 * Next's router doesn't reliably scroll to a same-page hash here, so when we're already on the home page we
 * scroll to the section ourselves (and keep the URL in sync). From any other page it navigates normally and
 * the home Stage scrolls to the hash once it mounts.
 */
export default function HashLink({ href, onClick, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || typeof href !== "string") return;
        const m = /^\/#([\w-]+)$/.exec(href);
        if (!m || pathname !== "/") return;
        const el = document.getElementById(m[1]);
        if (!el) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        window.history.pushState(null, "", `/#${m[1]}`);
      }}
    />
  );
}

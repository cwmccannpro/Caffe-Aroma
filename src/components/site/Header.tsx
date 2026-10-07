"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/ui/Logo";
import HashLink from "@/components/ui/HashLink";
import StatusChip from "@/components/ui/StatusChip";
import { business } from "@data/business";

const LINKS = [
  { href: "/order", label: "Menu & order" },
  { href: "/#tonight", label: "Tonight" },
  { href: "/#story", label: "Our story" },
  { href: "/#visit", label: "Visit" },
];

/** `dismiss` unlocks page scroll synchronously, so an in-page jump (/#tonight) is not swallowed by overflow:hidden. */
function MobileMenu({ dialog, onClose, dismiss }: { dialog: React.RefObject<HTMLDialogElement | null>; onClose: () => void; dismiss: () => void }) {
  return (
    <dialog ref={dialog} id="mobile-nav" className="nav-sheet" aria-label="Menu" onClose={onClose} onClick={(e) => e.target === dialog.current && dismiss()}>
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <Link href="/" onClick={dismiss} className="flex items-center gap-3" aria-label="Caffe Aroma, home">
            <Logo size={44} />
            <span className="display text-[1.25rem]">Caffe Aroma</span>
          </Link>
          <button type="button" aria-label="Close menu" onClick={dismiss} className="grid h-12 w-12 place-items-center rounded-full border" style={{ borderColor: "var(--line)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Mobile" className="mt-10">
          <ul className="grid">
            {LINKS.map((l, i) => (
              <li key={l.href} className="border-b" style={{ borderColor: "var(--line)" }}>
                <HashLink href={l.href} onClick={dismiss} className="display flex min-h-[64px] items-center justify-between text-[2.1rem]" style={{ animation: `rise .5s var(--ease) ${80 + i * 55}ms both` }}>
                  {l.label}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </HashLink>
              </li>
            ))}
          </ul>
        </nav>

        <Link href="/order" onClick={dismiss} className="btn btn-primary mt-8 w-full">
          Order ahead
        </Link>

        <div className="mt-auto pt-10">
          <StatusChip tone="theme" />
          <address className="mt-4 text-[1rem] not-italic leading-snug" style={{ color: "var(--muted)" }}>
            {business.address.street}, {business.address.city}
            <br />
            {business.address.crossStreets}
          </address>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.98rem] font-semibold">
            <a href={business.phoneHref} className="inline-flex min-h-[44px] items-center underline underline-offset-4">
              {business.phone}
            </a>
            <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center underline underline-offset-4">
              Directions
            </a>
            <a href={`https://www.instagram.com/${business.instagram}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center underline underline-offset-4">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function Header({ overScene = true }: { overScene?: boolean }) {
  const [solid, setSolid] = useState(false);
  const [onStage, setOnStage] = useState(overScene);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const on = () => {
      setSolid(window.scrollY > 24);
      const stage = document.getElementById("top");
      setOnStage(overScene && !!stage && stage.getBoundingClientRect().bottom > 90);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [overScene]);

  const openMenu = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    setMenuOpen(true);
    document.documentElement.style.overflow = "hidden";
  }, []);

  const onMenuClosed = useCallback(() => {
    setMenuOpen(false);
    document.documentElement.style.overflow = "";
  }, []);

  const dismissMenu = useCallback(() => {
    document.documentElement.style.overflow = "";
    dialog.current?.close();
  }, []);

  // leaving the phone layout while the menu is open should not strand a modal on a desktop screen
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && dialog.current?.open && dialog.current.close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const floating = onStage && !solid; // transparent at the very top of the 3D stage
  const glass = onStage && solid; // dark glass while scrolling over the stage
  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500"
        style={{
          background: floating ? "transparent" : glass ? "rgb(14 6 4 / 0.58)" : "color-mix(in oklab, var(--bg), transparent 12%)",
          backdropFilter: floating ? "none" : "blur(14px) saturate(1.2)",
          borderBottom: `1px solid ${floating ? "transparent" : glass ? "rgb(248 236 216 / .12)" : "var(--line)"}`,
          color: floating || glass ? "var(--on-scene)" : "var(--fg)",
        }}
      >
        <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-2 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Caffe Aroma, home">
            <Logo size={44} />
            <span className="hidden leading-tight sm:block">
              <span className="display block text-[1.25rem]">Caffe Aroma</span>
              <span className="eyebrow block opacity-70">Elmwood Village · Since 1995</span>
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <HashLink key={l.href} href={l.href} className="text-[0.95rem] font-medium opacity-85 transition-opacity hover:opacity-100">
                {l.label.replace(" & order", "")}
              </HashLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/order" className="btn btn-primary !min-h-[44px] !px-5 text-[0.95rem] max-[380px]:!px-3.5" style={floating || glass ? { background: "var(--amber)", color: "#1a110c" } : undefined}>
              Order ahead
            </Link>
            <a
              href={`https://www.instagram.com/${business.instagram}/`}
              target="_blank"
              rel="noreferrer"
              aria-label="Caffe Aroma on Instagram"
              className="grid h-11 w-11 place-items-center rounded-full border transition-colors hover:bg-[rgb(255_255_255/.12)]"
              style={{ borderColor: floating ? "rgb(248 236 216 / .4)" : "currentColor" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
              </svg>
            </a>
            <button type="button" onClick={openMenu} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobile-nav" className="grid h-11 w-11 place-items-center rounded-full border md:hidden" style={{ borderColor: floating ? "rgb(248 236 216 / .4)" : "currentColor" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu dialog={dialog} onClose={onMenuClosed} dismiss={dismissMenu} />
    </>
  );
}

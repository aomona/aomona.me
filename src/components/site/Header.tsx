"use client";

import gsap from "gsap";
import { Languages, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
] as const;

export function Header() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const activeUnderlineRef = useRef<HTMLDivElement>(null);
  const navLabelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [hasAnimatedUnderline, setHasAnimatedUnderline] = useState(false);

  const isActivePath = useCallback(
    (href: string) => {
      return href === "/"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const activeUnderline = activeUnderlineRef.current;

    return () => {
      if (indicator) {
        gsap.killTweensOf(indicator);
      }
      if (activeUnderline) {
        gsap.killTweensOf(activeUnderline);
      }
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const underline = activeUnderlineRef.current;
    const activeItem = navItems.find((item) => isActivePath(item.href));
    const activeLabel = activeItem ? navLabelRefs.current[activeItem.href] : null;
    if (!nav || !underline || !activeLabel) return;

    const moveUnderline = () => {
      const navRect = nav.getBoundingClientRect();
      const labelRect = activeLabel.getBoundingClientRect();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.to(underline, {
        x: labelRect.left - navRect.left,
        y: labelRect.bottom - navRect.top + 2,
        width: labelRect.width,
        opacity: 1,
        duration: reduceMotion ? 0 : 0.34,
        ease: "expo.out",
        overwrite: true,
      });
    };

    moveUnderline();
    setHasAnimatedUnderline(true);
    window.addEventListener("resize", moveUnderline);

    return () => {
      window.removeEventListener("resize", moveUnderline);
    };
  }, [isActivePath, pathname]);

  function moveIndicator(target: HTMLElement) {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.to(indicator, {
      x: targetRect.left - navRect.left,
      y: targetRect.top - navRect.top,
      width: targetRect.width,
      height: targetRect.height,
      opacity: 1,
      scaleX: 1,
      duration: reduceMotion ? 0 : 0.22,
      ease: "expo.out",
      overwrite: true,
    });
  }

  function hideIndicator() {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.to(indicator, {
      opacity: 0,
      scaleX: 0.82,
      duration: reduceMotion ? 0 : 0.16,
      ease: "power2.out",
      overwrite: true,
    });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 rounded-full border border-white/20 bg-black/18 px-4 py-3 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:gap-6 sm:px-5">
        <Link
          className="shrink-0 text-sm font-semibold tracking-wide text-white transition hover:text-white/78 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none sm:text-base"
          href="/"
        >
          aomona.me
        </Link>

        <nav
          ref={navRef}
          aria-label="Primary navigation"
          className="relative hidden min-w-0 flex-1 md:block"
          onPointerLeave={hideIndicator}
        >
          <div
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 rounded-full bg-white/8 opacity-0 shadow-[0_8px_18px_rgba(255,255,255,0.06)]"
          />
          <div
            ref={activeUnderlineRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-20 h-px rounded-full bg-white/72 opacity-0"
          />
          <ul className="relative z-10 flex items-center justify-start gap-1 whitespace-nowrap sm:gap-2">
            {navItems.map((item) => {
              const isActive = isActivePath(item.href);

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-full px-3 py-2 text-xs font-medium underline-offset-6 transition hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none sm:text-sm ${
                      isActive
                        ? `text-white ${hasAnimatedUnderline ? "" : "underline decoration-white/72"}`
                        : "text-white/76"
                    }`}
                    href={item.href}
                    onFocus={(event) => moveIndicator(event.currentTarget)}
                    onPointerEnter={(event) => moveIndicator(event.currentTarget)}
                  >
                    <span
                      ref={(node) => {
                        navLabelRefs.current[item.href] = node;
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 md:hidden" />

        <details className="relative md:hidden [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition hover:bg-white/16 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none">
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-[calc(100%+12px)] w-46 rounded-2xl border border-white/20 bg-black/55 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          >
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = isActivePath(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-xl px-3 py-2 text-sm font-medium underline-offset-6 transition hover:bg-white/12 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none ${
                        isActive ? "text-white underline decoration-white/72" : "text-white/82"
                      }`}
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </details>

        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/16 has-focus-visible:ring-2 has-focus-visible:ring-white/80 has-focus-visible:outline-none sm:text-sm">
          <input aria-label="Switch language" className="peer sr-only" type="checkbox" />
          <Languages aria-hidden="true" className="size-4" />
          <span className="peer-checked:hidden">EN</span>
          <span className="hidden peer-checked:inline">JA</span>
        </label>
      </div>
    </header>
  );
}

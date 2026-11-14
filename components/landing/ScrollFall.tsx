"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pins its children to the top of the screen and publishes how far the visitor
 * has scrolled through the first screen as the CSS variable `--fall` (0 at the
 * top, 1 once a full screen has been scrolled). Children use `--fall` in their
 * own transforms to drift, tilt and fade: the hero "falls away" while the next
 * section slides up over it.
 *
 * Only a CSS variable changes on scroll, so React never re-renders. With
 * "reduce motion" on, `--fall` stays 0 and the hero simply scrolls under.
 */
export default function ScrollFall({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      el.style.setProperty("--fall", progress.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={`sticky top-0 ${className}`} style={{ ["--fall" as string]: 0 }}>
      {children}
    </div>
  );
}

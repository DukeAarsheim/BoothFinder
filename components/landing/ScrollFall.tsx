"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Publishes scroll progress as the CSS variable `--fall` (0 to 1) on its own
 * element. Children with the `.fall` class use it to drift, tilt and fade, so
 * content "falls away" as the visitor scrolls past it.
 *
 * - mode "pinned" (the hero): the element sticks to the top of the screen and
 *   `--fall` runs 0 → 1 over the first screen of scrolling, while the next
 *   section slides up over it.
 * - mode "exit" (every later section): the element scrolls normally and
 *   `--fall` runs 0 → 1 as its bottom edge travels up through the top 70% of
 *   the screen, i.e. once the visitor has read it and is leaving it.
 *
 * Only a CSS variable changes on scroll, so React never re-renders. With
 * "reduce motion" on, `--fall` stays 0 and the page scrolls plainly.
 */
export default function ScrollFall({
  children,
  mode = "pinned",
  as: Tag = "div",
  className = "",
  ...rest
}: {
  children: ReactNode;
  mode?: "pinned" | "exit";
  as?: "div" | "section";
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const raw = mode === "pinned" ? window.scrollY / vh : 1 - el.getBoundingClientRect().bottom / (vh * 0.7);
      el.style.setProperty("--fall", Math.min(1, Math.max(0, raw)).toFixed(4));
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
  }, [mode]);

  return (
    <Tag
      ref={ref as never}
      className={`${mode === "pinned" ? "sticky top-0" : "relative"} ${className}`}
      style={{ ["--fall" as string]: 0 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

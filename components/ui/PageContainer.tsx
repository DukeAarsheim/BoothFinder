import type { ReactNode } from "react";

/**
 * Standard page wrapper: the page's <main> element at the shared content width.
 * Use it on every regular page so widths and padding stay consistent.
 * Full-bleed pages (like the landing hero) render their own <main> instead.
 */
export default function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
  );
}

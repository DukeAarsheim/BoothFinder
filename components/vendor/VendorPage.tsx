import type { ReactNode } from "react";

/** Standard padded page inside the vendor shell: title, one-line intro, content. */
export default function VendorPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h1>
      {intro && <p className="mt-1 text-neutral-600">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

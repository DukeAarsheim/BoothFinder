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
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-2 text-neutral-300">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

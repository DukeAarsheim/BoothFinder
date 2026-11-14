import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SignInCard from "@/components/auth/SignInCard";
import { SIGN_IN_ROLES, isSignInRole } from "@/lib/auth/roles";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Sign in" };

export function generateStaticParams() {
  return Object.keys(SIGN_IN_ROLES).map((role) => ({ role }));
}

// Third step of the visitor journey: / → /start (pick a side) → /signin/[role].
// Demo sign-in only: no accounts exist (MASTER.md §2), every option continues
// to the chosen side of the app.
export default async function SignInPage({ params }: PageProps<"/signin/[role]">) {
  const { role } = await params;
  if (!isSignInRole(role)) notFound();

  return (
    // Light surface (the root theme is dark, so set colors explicitly).
    <main
      className={`flex flex-1 flex-col items-center justify-center bg-neutral-50 px-6 py-14 text-neutral-900 [color-scheme:light] ${uiFont.className}`}
    >
      <SignInCard role={role} />
    </main>
  );
}

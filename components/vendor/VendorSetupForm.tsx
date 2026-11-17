"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { DEFAULT_ASSUMPTIONS } from "@/lib/scoring/projection";
import { OFFERINGS, isValidEmail, normalizeWebsite, type Offering } from "@/lib/vendor/account";
import { DEFAULT_BRAND_PROFILE, useBrandProfile, useVendorAccount } from "@/lib/vendor/storage";
import type { BrandProfile } from "@/lib/types";
import { setSkippedSetup } from "@/lib/vendor/setupSkip";
import { Num, input } from "./BrandProfileForm";

const pill = (selected: boolean) =>
  `flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-emerald-700 ${
    selected
      ? "border-neutral-950 bg-neutral-950 text-white"
      : "border-neutral-300 text-neutral-700 hover:border-neutral-950"
  }`;

/**
 * Account setup: who the vendor is, plus the numbers behind every profit
 * estimate. Shown first to a new vendor, and reachable afterwards as "Account".
 * Saves in this browser for this account (lib/vendor/storage.ts).
 */
export default function VendorSetupForm() {
  const { account, save: saveAccount, ready } = useVendorAccount();
  const [profile, saveProfile] = useBrandProfile();
  const { user } = useAuthUser();

  if (!ready) return <p className="text-neutral-500">Loading your account…</p>;

  return (
    <Fields
      // Remount when the signed-in email arrives so it can pre-fill the field.
      key={user?.email ?? "no-email"}
      isNew={!account}
      initialAccount={account}
      initialProfile={profile ?? DEFAULT_BRAND_PROFILE}
      signInEmail={user?.email ?? ""}
      onSave={(a, p) => {
        saveProfile(p);
        saveAccount(a);
      }}
    />
  );
}

function Fields({
  isNew,
  initialAccount,
  initialProfile,
  signInEmail,
  onSave,
}: {
  isNew: boolean;
  initialAccount: ReturnType<typeof useVendorAccount>["account"];
  initialProfile: BrandProfile;
  signInEmail: string;
  onSave: (account: NonNullable<ReturnType<typeof useVendorAccount>["account"]>, profile: BrandProfile) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState({
    companyName: initialAccount?.companyName ?? "",
    contactName: initialAccount?.contactName ?? "",
    email: initialAccount?.email ?? signInEmail,
    phone: initialAccount?.phone ?? "",
    website: initialAccount?.website ?? "",
    baseCity: initialAccount?.baseCity ?? "",
    description: initialAccount?.description ?? "",
  });
  const [offering, setOffering] = useState<Offering>(initialAccount?.offering ?? "drinks");
  const [num, setNum] = useState({
    price: String(initialProfile.price),
    margin: String(Math.round(initialProfile.margin * 1000) / 10),
    otherCosts: String(initialProfile.otherCosts),
    transactionsPerHour: String(initialProfile.transactionsPerHour ?? DEFAULT_ASSUMPTIONS.transactionsPerHour),
    sellingHoursPerDay: String(initialProfile.sellingHoursPerDay ?? DEFAULT_ASSUMPTIONS.sellingHoursPerDay),
  });
  const [productType, setProductType] = useState<BrandProfile["productType"]>(initialProfile.productType);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setT = (k: keyof typeof text) => (v: string) => {
    setText((t) => ({ ...t, [k]: v }));
    setSaved(false);
  };
  const setN = (k: keyof typeof num) => (v: string) => {
    setNum((n) => ({ ...n, [k]: v }));
    setSaved(false);
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const website = normalizeWebsite(text.website);
    if (!text.companyName.trim()) return setError("Add your company name.");
    if (!isValidEmail(text.email)) return setError("Enter an email address we can reach you at, like you@yourbrand.com.");
    if (website === null) return setError("That website doesn't look right. Try something like yourbrand.com.");

    setError(null);
    onSave(
      {
        companyName: text.companyName.trim(),
        contactName: text.contactName.trim(),
        email: text.email.trim(),
        phone: text.phone.trim(),
        website,
        baseCity: text.baseCity.trim(),
        offering,
        description: text.description.trim(),
        completedAt: initialAccount?.completedAt ?? new Date().toISOString(),
      },
      {
        price: Number(num.price),
        margin: Number(num.margin) / 100,
        otherCosts: Number(num.otherCosts),
        productType,
        transactionsPerHour: Number(num.transactionsPerHour),
        sellingHoursPerDay: Number(num.sellingHoursPerDay),
      },
    );
    setSaved(true);
    if (isNew) router.push("/vendor");
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-10">
      {isNew && (
        <p className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
          <span>
            <strong>Welcome to Boothfinder.</strong> Two quick sections, then you&apos;ll see the map with your
            own estimated profit at every event. You can change any of this later under Account.
          </span>
        </p>
      )}

      <Section title="About your business" hint="So organizers know who you are, and so your account is yours.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Company name" required value={text.companyName} onChange={setT("companyName")} placeholder="Sunny Side Juice Co." autoComplete="organization" />
          <Text label="Your name" value={text.contactName} onChange={setT("contactName")} placeholder="Alex Rivera" autoComplete="name" />
          <Text label="Contact email" required type="email" value={text.email} onChange={setT("email")} placeholder="you@yourbrand.com" autoComplete="email" />
          <Text label="Phone" hint="Optional" type="tel" value={text.phone} onChange={setT("phone")} placeholder="(555) 123-4567" autoComplete="tel" />
          <Text label="Website or Instagram link" hint="Optional" value={text.website} onChange={setT("website")} placeholder="yourbrand.com" autoComplete="url" />
          <Text label="Where you're based" hint="Optional: city or town" value={text.baseCity} onChange={setT("baseCity")} placeholder="San Luis Obispo" autoComplete="address-level2" />
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-950">What you sell</legend>
          <div className="mt-2 flex flex-wrap gap-2 sm:flex-nowrap">
            {OFFERINGS.map((o) => (
              <label key={o.value} className={pill(offering === o.value)}>
                <input
                  type="radio"
                  name="offering"
                  value={o.value}
                  checked={offering === o.value}
                  onChange={() => {
                    setOffering(o.value);
                    setSaved(false);
                  }}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-neutral-950">About your products</span>
          <span className="block text-xs text-neutral-500">Optional: a line or two, like &ldquo;cold-pressed juices and smoothies&rdquo;</span>
          <textarea
            value={text.description}
            onChange={(e) => setT("description")(e.target.value)}
            rows={3}
            maxLength={300}
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-950 transition-colors hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700"
          />
        </label>
      </Section>

      <Section
        title="Your numbers"
        hint="These drive every profit estimate on the map and in the Fit Calculator. Rough numbers are fine: you can change them any time."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Num label="Average sale" hint="What a typical customer spends" prefix="$" min={0.01} step="0.01" value={num.price} onChange={setN("price")} />
          <Num label="Gross margin" hint="Share of each sale you keep after ingredients" suffix="%" min={0} max={100} step="0.1" value={num.margin} onChange={setN("margin")} />
          <Num label="Other costs per event" hint="Travel, staff, permits, insurance (not ingredients or the booth fee)" prefix="$" min={0} step="1" value={num.otherCosts} onChange={setN("otherCosts")} />
          <Num label="Sales per hour" hint="How many customers your booth can serve in an hour" min={0} step="1" value={num.transactionsPerHour} onChange={setN("transactionsPerHour")} />
          <Num label="Selling hours per day" hint="Hours you're open on each event day" min={0} max={24} step="0.5" value={num.sellingHoursPerDay} onChange={setN("sellingHoursPerDay")} />
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-950">Hot or cold</legend>
          <p className="text-xs text-neutral-500">Used for the weather adjustment: cold items sell more on warm days, hot items on cool ones.</p>
          <div className="mt-2 flex gap-2">
            {(["cold", "hot"] as const).map((t) => (
              <label key={t} className={pill(productType === t)}>
                <input
                  type="radio"
                  name="productType"
                  value={t}
                  checked={productType === t}
                  onChange={() => {
                    setProductType(t);
                    setSaved(false);
                  }}
                  className="sr-only"
                />
                {t === "cold" ? "Cold drinks / food" : "Hot drinks / food"}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-full bg-emerald-700 px-6 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {isNew ? "Finish setup and see events" : "Save changes"}
        </button>
        {isNew && (
          <Link
            href="/vendor"
            onClick={() => setSkippedSetup(true)}
            className="text-sm font-semibold text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Skip for now and just look at the map
          </Link>
        )}
        <p role="status" className="text-sm text-emerald-700">
          {saved && !isNew ? "Saved in this browser" : ""}
        </p>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-neutral-950">{title}</h2>
      <p className="mt-0.5 mb-5 text-sm text-neutral-600">{hint}</p>
      {children}
    </section>
  );
}

function Text({
  label,
  hint,
  value,
  onChange,
  required,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-950">{label}</span>
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={120}
        className={`${input} mt-2`}
        {...rest}
      />
    </label>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { BrandProfile } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/scoring/projection";
import { DEFAULT_BRAND_PROFILE, useBrandProfile } from "@/lib/vendor/storage";

export const input =
  "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-neutral-950 transition-colors hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

/**
 * Edits the BrandProfile (lib/types.ts) and saves it in this browser. The Fit
 * score card reads it with `useBrandProfile()` from lib/vendor/storage.
 * Percent fields are shown as 0–100 and stored as 0–1, matching MASTER.md §4.
 */
export default function BrandProfileForm() {
  const [stored, save] = useBrandProfile();
  const [justSaved, setJustSaved] = useState(false);
  return (
    <Fields
      // Remount the fields when the stored profile first loads from the browser.
      key={stored ? "stored" : "default"}
      initial={stored ?? DEFAULT_BRAND_PROFILE}
      isNew={!stored}
      justSaved={justSaved}
      onEdit={() => setJustSaved(false)}
      onSave={(profile) => {
        save(profile);
        setJustSaved(true);
      }}
    />
  );
}

function Fields({
  initial,
  onSave,
  onEdit,
  isNew,
  justSaved,
}: {
  initial: BrandProfile;
  onSave: (p: BrandProfile) => void;
  onEdit: () => void;
  isNew: boolean;
  justSaved: boolean;
}) {
  const [draft, setDraft] = useState({
    price: String(initial.price),
    margin: String(Math.round(initial.margin * 1000) / 10),
    otherCosts: String(initial.otherCosts),
    productType: initial.productType,
    transactionsPerHour: String(initial.transactionsPerHour ?? DEFAULT_ASSUMPTIONS.transactionsPerHour),
    sellingHoursPerDay: String(initial.sellingHoursPerDay ?? DEFAULT_ASSUMPTIONS.sellingHoursPerDay),
  });
  const set = (k: keyof typeof draft) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    onEdit();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      price: Number(draft.price),
      margin: Number(draft.margin) / 100,
      otherCosts: Number(draft.otherCosts),
      productType: draft.productType,
      transactionsPerHour: Number(draft.transactionsPerHour),
      sellingHoursPerDay: Number(draft.sellingHoursPerDay),
    });
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      {isNew && (
        <p className="text-sm text-neutral-600">
          Starting values are an example juice brand. Replace them with your own numbers.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Num label="Average sale" hint="What a typical customer spends" prefix="$" min={0.01} step="0.01" value={draft.price} onChange={set("price")} />
        <Num label="Gross margin" hint="Share of each sale you keep after ingredients" suffix="%" min={0} max={100} step="0.1" value={draft.margin} onChange={set("margin")} />
        <Num label="Other costs per event" hint="Travel, staff, permits, insurance (not ingredients or the booth fee)" prefix="$" min={0} step="1" value={draft.otherCosts} onChange={set("otherCosts")} />
        <Num label="Sales per hour" hint="How many customers your booth can serve in an hour" min={0} step="1" value={draft.transactionsPerHour} onChange={set("transactionsPerHour")} />
        <Num label="Selling hours per day" hint="Hours you're open on each event day" min={0} max={24} step="0.5" value={draft.sellingHoursPerDay} onChange={set("sellingHoursPerDay")} />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-neutral-950">What you sell</legend>
        <p className="text-xs text-neutral-500">Used for the weather adjustment: cold drinks sell more on warm days, hot drinks on cool ones. How many people buy and how many competitors there are is estimated for you from each event&apos;s size, type and weather.</p>
        <div className="mt-2 flex gap-2">
          {(["cold", "hot"] as const).map((t) => (
            <label
              key={t}
              className={`relative flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold text-neutral-950 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-emerald-700 ${
                draft.productType === t
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-950"
              }`}
            >
              <input
                type="radio"
                name="productType"
                value={t}
                checked={draft.productType === t}
                onChange={() => set("productType")(t)}
                className="sr-only"
              />
              {t === "cold" ? "Cold drinks / food" : "Hot drinks / food"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-full bg-emerald-700 px-6 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Save my numbers
        </button>
        <p role="status" className="flex items-center gap-1 text-sm text-emerald-700">
          {justSaved && (
            <>
              <Check className="size-4" aria-hidden /> Saved in this browser
            </>
          )}
        </p>
      </div>
    </form>
  );
}

export function Num({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  ...rest
}: {
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-950">{label}</span>
      <span className="block text-xs text-neutral-500">{hint}</span>
      <span className="relative mt-2 block">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${input} ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500">{suffix}</span>}
      </span>
    </label>
  );
}

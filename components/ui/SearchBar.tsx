"use client";

import { Search, X } from "lucide-react";

/**
 * Search box for the light pages: magnifier, clear button, and an optional
 * "3 of 12" count beside it. The parent owns the text and does the filtering.
 */
export default function SearchBar({
  value,
  onChange,
  label,
  placeholder,
  shown,
  total,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Search events". */
  label: string;
  placeholder: string;
  /** How many results are showing, and out of how many; shown while searching. */
  shown?: number;
  total?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <div className="relative min-w-0 flex-1 basis-64">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="h-11 w-full rounded-full border border-neutral-300 bg-white pr-11 pl-10 text-[15px] text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {value.trim() && shown != null && total != null && (
        <p className="text-[13px] text-neutral-600" role="status">
          {shown} of {total}
        </p>
      )}
    </div>
  );
}

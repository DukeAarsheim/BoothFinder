"use client";
import { Bookmark } from "lucide-react";
import { useSavedEvents } from "@/lib/vendor/storage";
export default function EventDetailActions({ id }: { id: string }) {
  const { isSaved, toggle } = useSavedEvents();
  const saved = isSaved(id);
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={saved}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      <Bookmark
        className={`size-4 ${saved ? "fill-emerald-700 text-emerald-700" : ""}`}
        aria-hidden
      />
      {saved ? "Saved event" : "Save event"}
    </button>
  );
}

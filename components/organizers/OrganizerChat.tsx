"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Notice from "@/components/ui/Notice";

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Make me a logistics checklist for our festival, counting back from the event date.",
  "How many drink vendors should we accept, and what mix of hot and cold?",
  "Is our $350 booth fee fair for vendors? What do similar events charge?",
  "Which vendors would be a good fit for our festival, and why?",
];

export default function OrganizerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/organizer-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; code?: string };
      if (!res.ok || !data.reply) {
        if (data.code === "not_configured") setNotConfigured(true);
        setError(data.error ?? "Something went wrong. Try again.");
        // Drop the unanswered question so the user can retry it.
        setMessages(messages);
        setInput(question);
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setMessages(messages);
      setInput(question);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section
      aria-label="Organizer assistant"
      className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/40"
    >
      <div className="border-b border-neutral-800 px-5 py-4">
        <h2 className="font-semibold">Ask the organizer assistant</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Logistics checklists, vendor mix, booth pricing and vendor matches for your event.
          AI answers can be wrong; confirm permits and fees with the county or city.
        </p>
      </div>

      <div className="max-h-[32rem] min-h-48 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-neutral-400">Try one of these:</p>
            <ul className="mt-3 flex flex-col gap-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void send(s)}
                    disabled={loading}
                    className="w-full rounded-md border border-neutral-800 px-3 py-2 text-left text-sm text-neutral-200 transition-colors hover:border-emerald-400/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-400 text-neutral-950"
                  : "border border-neutral-800 bg-neutral-900 text-neutral-100"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </div>
          </div>
        ))}

        {loading && <p className="text-sm text-neutral-400">Thinking…</p>}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-5 pb-4">
          <Notice title={error} tone={notConfigured ? "warning" : "error"}>
            {notConfigured && (
              <p>
                Add AI_API_KEY, AI_BASE_URL and AI_MODEL to .env.local (see .env.example),
                then restart the dev server.
              </p>
            )}
          </Notice>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-neutral-800 p-4">
        <label htmlFor="organizer-question" className="sr-only">
          Your question
        </label>
        <input
          id="organizer-question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about permits, vendors, layout, pricing…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-emerald-400"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}

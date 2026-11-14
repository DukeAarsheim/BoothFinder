"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import VendorNotice from "@/components/vendor/VendorNotice";

type Message = { role: "user" | "assistant"; content: string };

/**
 * Light cleanup for model output shown as plain text: drops placeholder
 * citation marks like 【source】, strips markdown heading marks, and turns
 * **bold** into <strong>. No HTML from the model is ever rendered.
 */
function renderReply(text: string) {
  const cleaned = text
    .replace(/【[^】]*】/g, "")
    .replace(/^#{1,6}\s+/gm, "");
  return cleaned.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-neutral-950">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

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
      className="flex flex-col rounded-2xl border border-neutral-200 bg-white"
    >
      <div className="border-b border-neutral-200 px-6 py-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-950">
          <Sparkles className="size-5 text-emerald-700" strokeWidth={1.75} aria-hidden />
          Ask the organizer assistant
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Logistics checklists, vendor mix, booth pricing and vendor matches for your event.
          AI answers can be wrong; confirm permits and fees with the county or city.
        </p>
      </div>

      <div className="max-h-[32rem] min-h-48 space-y-4 overflow-y-auto px-6 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-neutral-500">Try one of these:</p>
            <ul className="mt-3 flex flex-col gap-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void send(s)}
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
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
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-700 text-white"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-800"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.role === "assistant" ? renderReply(m.content) : m.content}
            </div>
          </div>
        ))}

        {loading && <p className="text-sm text-neutral-500">Thinking…</p>}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-6 pb-4">
          <VendorNotice title={error} tone={notConfigured ? "warning" : "error"}>
            {notConfigured && (
              <p>
                Add AI_API_KEY, AI_BASE_URL and AI_MODEL to .env.local (see .env.example),
                then restart the dev server.
              </p>
            )}
          </VendorNotice>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-neutral-200 p-4">
        <label htmlFor="organizer-question" className="sr-only">
          Your question
        </label>
        <input
          id="organizer-question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about permits, vendors, layout, pricing…"
          maxLength={2000}
          className="h-11 min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
        >
          Send
          <SendHorizontal className="size-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}

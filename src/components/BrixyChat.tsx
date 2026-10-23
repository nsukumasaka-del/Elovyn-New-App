import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "@/lib/store-api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const suggestions = ["Recommend a hoodie", "Build me an outfit", "Shipping policy"];

function BrixyAvatar({ small = false }: { small?: boolean }) {
  return <span aria-hidden="true" className={`${small ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm"} relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-700 via-fuchsia-600 to-amber-400 font-black text-white shadow-sm`}>
    B
    <Sparkles className={`${small ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} absolute -right-0.5 -top-0.5 rounded-full bg-white p-0.5 text-violet-700`} />
  </span>;
}

export function BrixyChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi, I’m Brixy. Tell me what you’re shopping for and I’ll help you find the right look.",
  }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open, sending]);

  if (location.pathname.startsWith("/admin")) return null;

  async function sendMessage(content: string) {
    const text = content.trim();
    if (!text || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const nextMessages = [...messages.filter((message) => !message.error), userMessage].slice(-12);
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);
    try {
      const response = await apiRequest<{ message: string }>("/chat", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })) }),
      });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: response.message }]);
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Brixy is temporarily busy. Please try again in a moment.",
        error: true,
      }]);
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return <div className="fixed bottom-4 right-4 z-[85] sm:bottom-6 sm:right-6">
    {open && <section role="dialog" aria-modal="false" aria-label="Chat with Brixy" className="mb-3 flex h-[min(560px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
      <header className="flex items-center gap-3 bg-neutral-950 px-4 py-3.5 text-white">
        <BrixyAvatar />
        <div className="min-w-0 flex-1"><h2 className="font-bold">Brixy</h2><p className="text-xs text-white/70">Elovyn shopping assistant</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close Brixy chat" className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
      </header>

      <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-4 py-4">
        {messages.map((message) => <div key={message.id} className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "assistant" && <BrixyAvatar small />}
          <p className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${message.role === "user" ? "rounded-br-md bg-neutral-950 text-white" : message.error ? "rounded-bl-md border border-red-100 bg-red-50 text-red-700" : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800"}`}>{message.content}</p>
        </div>)}
        {sending && <div className="flex items-end gap-2"><BrixyAvatar small /><div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3" aria-label="Brixy is typing"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.2s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.1s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" /></span></div></div>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-neutral-200 bg-white px-3 pb-3 pt-2.5">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={sending} onClick={() => void sendMessage(suggestion)} className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50">{suggestion}</button>)}
        </div>
        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="brixy-message">Message Brixy</label>
          <textarea id="brixy-message" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 1200))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(draft); } }} rows={1} placeholder="Ask about products or delivery…" className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-700 text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-neutral-300"><Send className="h-4 w-4" /></button>
        </form>
        <p className="mt-2 text-center text-[10px] text-neutral-400">Brixy can make mistakes. Confirm important details at checkout.</p>
      </div>
    </section>}

    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? "Close Brixy chat" : "Chat with Brixy"} className="ml-auto flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2.5 font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-violet-800 sm:px-4">
      {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      <span className="text-sm">{open ? "Close" : "Chat with Brixy"}</span>
    </button>
  </div>;
}

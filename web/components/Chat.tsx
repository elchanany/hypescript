"use client";

import { useEffect, useRef, useState } from "react";
import { AgentRunner } from "@/lib/agent/runtime";
import { AgentContext, TOOL_BY_NAME } from "@/lib/agent/tools";
import { Provider, PROVIDER_LABELS } from "@/lib/agent/types";
import { PROVIDER_PREF } from "@/lib/keys";

type Item =
  | { kind: "user" | "assistant"; text: string; time: string }
  | {
      kind: "tool";
      id: string;
      label: string;
      color: string;
      icon: string;
      status: string;
      state: "running" | "ok" | "error";
      summary: string;
      time: string;
    };

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Chat({ file, duration }: { file: File | null; duration: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState<{ q: string; options: string[]; resolve: (v: string) => void } | null>(null);
  const [open, setOpen] = useState(true);

  const ctxRef = useRef<AgentContext>({
    file: null,
    duration: 0,
    words: null,
    keeps: null,
    lastRender: null,
    askUser: (q, options) => new Promise<string>((resolve) => setAsk({ q, options, resolve })),
  });
  const runnerRef = useRef<AgentRunner | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // סנכרון הקובץ/אורך למצב הסוכן; קובץ חדש מאפס תמלול/חיתוכים.
  useEffect(() => {
    const c = ctxRef.current;
    if (c.file !== file) {
      c.words = null;
      c.keeps = null;
    }
    c.file = file;
    c.duration = duration;
  }, [file, duration]);

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfigured(d.providers || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items, ask]);

  function getRunner(): AgentRunner {
    if (!runnerRef.current) {
      runnerRef.current = new AgentRunner(provider, ctxRef.current, {
        onAssistant: (text) => setItems((p) => [...p, { kind: "assistant", text, time: now() }]),
        onToolStart: (call) => {
          const m = TOOL_BY_NAME[call.name];
          setItems((p) => [
            ...p,
            {
              kind: "tool",
              id: call.id,
              label: m?.label || call.name,
              color: m?.color || "#64748b",
              icon: m?.icon || "🛠️",
              status: "מתחיל…",
              state: "running",
              summary: "",
              time: now(),
            },
          ]);
        },
        onToolStatus: (id, status) =>
          setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, status } : it))),
        onToolEnd: (id, ok, summary) =>
          setItems((p) =>
            p.map((it) =>
              it.kind === "tool" && it.id === id
                ? { ...it, state: ok ? "ok" : "error", status: ok ? "הושלם" : "שגיאה", summary }
                : it,
            ),
          ),
        onError: (msg) => setItems((p) => [...p, { kind: "assistant", text: "⚠ " + msg, time: now() }]),
        onDone: () => setRunning(false),
      });
    }
    runnerRef.current.provider = provider;
    return runnerRef.current;
  }

  const send = () => {
    const text = input.trim();
    if (!text || running) return;
    if (!file) {
      setItems((p) => [...p, { kind: "assistant", text: "טען קודם קובץ וידאו למעלה 👆", time: now() }]);
      return;
    }
    if (!configured[provider]) {
      setItems((p) => [
        ...p,
        { kind: "assistant", text: `לספק ${PROVIDER_LABELS[provider]} אין מפתח מוגדר ב-Vercel. ראה הגדרות.`, time: now() },
      ]);
      return;
    }
    setItems((p) => [...p, { kind: "user", text, time: now() }]);
    setInput("");
    setRunning(true);
    getRunner().send(text);
  };

  const changeProvider = (p: Provider) => {
    setProvider(p);
    localStorage.setItem(PROVIDER_PREF, p);
    if (runnerRef.current) runnerRef.current.provider = p;
  };

  const copy = (t: string) => navigator.clipboard?.writeText(t);

  return (
    <div className={`chat ${open ? "open" : "closed"}`}>
      <div className="chat-head">
        <div className="chat-head-l" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
          <span className="chat-title">🤖 סוכן העריכה</span>
          {open && <span className="hint"> · מבצע פעולות על הסרטון לפי בקשתך</span>}
          {running && <span className="live-dot" title="פעיל" />}
        </div>
        <div className="chat-head-r">
          <select
            value={provider}
            onChange={(e) => changeProvider(e.target.value as Provider)}
            className="prov-select"
          >
            {(["deepseek", "openai", "anthropic", "gemini"] as Provider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]} {configured[p] ? "✓" : "—"}
              </option>
            ))}
          </select>
          <button className="collapse" onClick={() => setOpen((o) => !o)} title={open ? "מזער" : "הרחב"}>
            {open ? "▾" : "▴"}
          </button>
        </div>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {items.length === 0 && (
          <div className="chat-empty">
            שלום 👋 אני סוכן העריכה. טען סרטון למעלה, ואמור לי מה לעשות — למשל:
            <br />“תשאיר רק את הטקסט הזה: …”, או “תחתוך את הקטע על X”, או “תמלל ותסיר נשימות”.
          </div>
        )}
        {items.map((it, i) =>
          it.kind === "tool" ? (
            <div key={i} className="tool-card" style={{ borderInlineStartColor: it.color }}>
              <span className="tool-icon" style={{ background: it.color + "22" }}>{it.icon}</span>
              <div className="tool-main">
                <div className="tool-top">
                  <b style={{ color: it.color }}>{it.label}</b>
                  <span className="tool-time">{it.time}</span>
                </div>
                <div className="tool-status">
                  {it.state === "running" && <span className="dots"><i></i><i></i><i></i></span>}
                  {it.state === "ok" && <span className="ok">✓</span>}
                  {it.state === "error" && <span className="err">✕</span>}
                  {it.state === "running" ? it.status : it.summary || it.status}
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className={`msg ${it.kind}`}>
              <div className="bubble">
                {it.text}
                <button className="copy" onClick={() => copy(it.text)} title="העתק">⧉</button>
              </div>
              <span className="msg-time">{it.time}</span>
            </div>
          ),
        )}

        {ask && (
          <div className="ask">
            <div className="ask-q">{ask.q}</div>
            <div className="ask-opts">
              {ask.options.map((o, i) => (
                <button key={i} className="btn" onClick={() => { ask.resolve(o); setAsk(null); }}>{o}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="כתוב הוראה לסוכן… (Enter לשליחה)"
          rows={1}
        />
        {running ? (
          <button className="btn stop" onClick={() => runnerRef.current?.stop()}>⏹ עצור</button>
        ) : (
          <button className="btn primary" onClick={send} disabled={!input.trim()}>שלח</button>
        )}
      </div>
    </div>
  );
}

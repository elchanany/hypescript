"use client";

import { useEffect, useRef, useState } from "react";
import { AgentRunner } from "@/lib/agent/runtime";
import { AgentContext, TOOL_BY_NAME } from "@/lib/agent/tools";
import { Provider, PROVIDER_LABELS } from "@/lib/agent/types";
import { PROVIDER_PREF } from "@/lib/keys";
import { Word } from "@/lib/models";
import { Clip, MediaAsset, firstVideo } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { kvGet, kvSet, pk } from "@/lib/storage";
import { ChatMessage } from "@/lib/agent/types";

type Item =
  | { kind: "user" | "assistant"; text: string; time: string }
  | { kind: "tool"; id: string; label: string; color: string; icon: string; status: string; state: "running" | "ok" | "error"; summary: string; time: string }
  | { kind: "output"; name: string; url: string; mkind: "video" | "srt" | "image"; time: string };

const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

interface ChatProps {
  media: MediaAsset[];
  onAddMedia: (files: FileList | File[] | null) => void;
  words: Word[] | null;
  clips: Clip[] | null;
  subs: Sub[] | null;
  projectId: string | null;
  onProject: (p: { words: Word[] | null; clips: Clip[] | null; subs: Sub[] | null }) => void;
}

export default function Chat({ media, onAddMedia, words, clips, subs, projectId, onProject }: ChatProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState<{ q: string; options: string[]; resolve: (v: string) => void } | null>(null);
  const [askText, setAskText] = useState("");

  const addOutput = (blob: Blob, name: string, mkind: "video" | "srt" | "image") =>
    setItems((p) => [...p, { kind: "output", name, url: URL.createObjectURL(blob), mkind, time: now() }]);

  const ctxRef = useRef<AgentContext>({
    media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null, lastRender: null,
    askUser: (q, options) => new Promise<string>((resolve) => setAsk({ q, options, resolve })),
    onOutput: addOutput,
    pendingImages: [],
  });
  const runnerRef = useRef<AgentRunner | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onProjectRef = useRef(onProject);
  onProjectRef.current = onProject;
  ctxRef.current.onOutput = addOutput;
  const savedHistory = useRef<ChatMessage[]>([]);
  const [restoredChat, setRestoredChat] = useState(false);

  // שחזור/החלפת שיחה לפי פרויקט — כולל איפוס זיכרון הסוכן.
  useEffect(() => {
    if (!projectId) return;
    setRestoredChat(false);
    (async () => {
      const c = await kvGet<{ items: Item[]; history: ChatMessage[] }>(pk(projectId, "chat"));
      runnerRef.current = null; // סוכן חדש לפרויקט הנוכחי
      savedHistory.current = c?.history || [];
      setItems((c?.items || []).filter((it) => it.kind !== "output"));
      setRestoredChat(true);
    })();
  }, [projectId]);

  // שמירת השיחה (בלי כרטיסי פלט שה-URL שלהם נמחק ברענון) + זיכרון הסוכן.
  useEffect(() => {
    if (!restoredChat || !projectId) return;
    const t = setTimeout(() => {
      const history = runnerRef.current?.history || savedHistory.current;
      kvSet(pk(projectId, "chat"), { items: items.filter((it) => it.kind !== "output"), history });
    }, 700);
    return () => clearTimeout(t);
  }, [items, restoredChat, projectId]);

  useEffect(() => {
    const c = ctxRef.current;
    c.media = media; c.duration = firstVideo(media)?.duration || 0; c.words = words; c.clips = clips; c.subs = subs;
  }, [media, words, clips, subs]);

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    fetch("/api/config").then((r) => r.json()).then((d) => setConfigured(d.providers || {})).catch(() => {});
  }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [items, ask]);

  function getRunner(): AgentRunner {
    if (!runnerRef.current) {
      runnerRef.current = new AgentRunner(provider, ctxRef.current, {
        onAssistant: (text) => setItems((p) => [...p, { kind: "assistant", text, time: now() }]),
        onToolStart: (call) => {
          const m = TOOL_BY_NAME[call.name];
          setItems((p) => [...p, { kind: "tool", id: call.id, label: m?.label || call.name, color: m?.color || "#64748b", icon: m?.icon || "🛠️", status: "מתחיל…", state: "running", summary: "", time: now() }]);
        },
        onToolStatus: (id, status) => setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, status } : it))),
        onToolEnd: (id, ok, summary) => {
          setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, state: ok ? "ok" : "error", status: ok ? "הושלם" : "שגיאה", summary } : it)));
          const c = ctxRef.current;
          onProjectRef.current({ words: c.words, clips: c.clips, subs: c.subs });
        },
        onError: (msg) => setItems((p) => [...p, { kind: "assistant", text: "⚠ " + msg, time: now() }]),
        onDone: () => setRunning(false),
      });
      if (savedHistory.current.length) runnerRef.current.history = savedHistory.current;
    }
    runnerRef.current.provider = provider;
    return runnerRef.current;
  }

  const send = () => {
    const text = input.trim();
    if (!text || running) return;
    if (!configured[provider]) { setItems((p) => [...p, { kind: "assistant", text: `לספק ${PROVIDER_LABELS[provider]} אין מפתח ב-Vercel. ראה הגדרות.`, time: now() }]); return; }
    setItems((p) => [...p, { kind: "user", text, time: now() }]);
    setInput(""); setRunning(true);
    getRunner().send(text);
  };

  const changeProvider = (p: Provider) => { setProvider(p); localStorage.setItem(PROVIDER_PREF, p); if (runnerRef.current) runnerRef.current.provider = p; };
  const copy = (t: string) => navigator.clipboard?.writeText(t);
  const attachRef = useRef<HTMLInputElement>(null);

  return (
    <div className="chat">
      <div className="chat-head">
        <div className="chat-head-l">
          <span className="chat-title">🤖 סוכן העריכה</span>
          {running && <span className="live-dot" title="פעיל" />}
        </div>
        <select value={provider} onChange={(e) => changeProvider(e.target.value as Provider)} className="prov-select">
          {(["deepseek", "openai", "anthropic", "gemini"] as Provider[]).map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]} {configured[p] ? "✓" : "—"}</option>
          ))}
        </select>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {items.length === 0 && (
          <div className="chat-empty">
            שלום 👋 העלה קבצים (📎), ותגיד לי מה לעשות — למשל:
            <br />“תשאיר רק את הטקסט הזה: …”, “תחתוך את הקטע על X”, “תמלל ותכין כתוביות SRT”.
          </div>
        )}
        {items.map((it, i) =>
          it.kind === "tool" ? (
            <div key={i} className="tool-card" style={{ borderInlineStartColor: it.color }}>
              <span className="tool-icon" style={{ background: it.color + "22" }}>{it.icon}</span>
              <div className="tool-main">
                <div className="tool-top"><b style={{ color: it.color }}>{it.label}</b><span className="tool-time">{it.time}</span></div>
                <div className="tool-status">
                  {it.state === "running" && <span className="dots"><i></i><i></i><i></i></span>}
                  {it.state === "ok" && <span className="ok">✓</span>}
                  {it.state === "error" && <span className="err">✕</span>}
                  {it.state === "running" ? it.status : it.summary || it.status}
                </div>
              </div>
            </div>
          ) : it.kind === "output" ? (
            <div key={i} className="output-card">
              <div className="tool-top"><b>{it.mkind === "video" ? "🎬 סרטון מוכן" : it.mkind === "image" ? "📸 פריים" : "💬 כתוביות SRT"}</b><span className="tool-time">{it.time}</span></div>
              {it.mkind === "video" && <video src={it.url} controls className="output-video" />}
              {it.mkind === "image" && <img src={it.url} alt="frame" className="output-video" />}
              <a className="btn good" href={it.url} download={it.name}>⬇ הורד {it.name}</a>
            </div>
          ) : (
            <div key={i} className={`msg ${it.kind}`}>
              <div className="bubble">{it.text}<button className="copy" onClick={() => copy(it.text)} title="העתק">⧉</button></div>
              <span className="msg-time">{it.time}</span>
            </div>
          ),
        )}
        {ask && (
          <div className="ask">
            <div className="ask-q">{ask.q}</div>
            <div className="ask-opts">{ask.options.map((o, i) => (<button key={i} className="btn" onClick={() => { ask.resolve(o); setAsk(null); setAskText(""); }}>{o}</button>))}</div>
            <div className="ask-free">
              <input value={askText} onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && askText.trim()) { ask.resolve(askText.trim()); setAsk(null); setAskText(""); } }}
                placeholder="או כתוב תשובה משלך…" />
              <button className="btn primary" disabled={!askText.trim()} onClick={() => { ask.resolve(askText.trim()); setAsk(null); setAskText(""); }}>שלח</button>
            </div>
          </div>
        )}
      </div>

      {media.length > 0 && (
        <div className="mention-row">
          {media.map((m) => (
            <button key={m.id} className="mention-chip" title={m.name} onClick={() => setInput((v) => `${v}@${m.name} `)}>
              {m.kind === "video" ? "🎞️" : m.kind === "image" ? "🖼️" : "🎵"} {m.name.length > 14 ? m.name.slice(0, 13) + "…" : m.name}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input">
        <button className="attach" onClick={() => attachRef.current?.click()} title="העלה קובץ">📎</button>
        <input ref={attachRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { onAddMedia(e.target.files); e.currentTarget.value = ""; }} />
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="כתוב הוראה לסוכן… (Enter לשליחה)" rows={1} />
        {running ? <button className="btn stop" onClick={() => runnerRef.current?.stop()}>⏹ עצור</button>
          : <button className="btn primary" onClick={send} disabled={!input.trim()}>שלח</button>}
      </div>
    </div>
  );
}

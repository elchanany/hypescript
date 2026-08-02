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
import {
  Bot, X, Send, Square, Paperclip, Copy, Check, AlertTriangle, Loader2, Film as FilmIcon, Music, Image as ImageIcon,
  Scissors, Trash2, Plus, Move, Search, Type, Layers, AudioLines, Camera, Captions, Pencil, Clock, FileDown, FileUp,
  HelpCircle, Info, Wrench, Film, Download,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

type Item =
  | { kind: "user" | "assistant" | "error"; text: string; time: string }
  | { kind: "tool"; id: string; label: string; color: string; status: string; state: "running" | "ok" | "error"; summary: string; time: string; name: string }
  | { kind: "output"; name: string; url: string; mkind: "video" | "srt" | "image"; time: string };

const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// tool name -> icon (single consistent family; falls back to a generic wrench).
const TOOL_ICON: Record<string, LucideIcon> = {
  get_video_info: Info, list_media: Layers, transcribe_video: Type, find_in_transcript: Search, get_transcript: Type,
  keep_by_script: Scissors, remove_segments: Scissors, add_clip: Plus, list_clips: Layers, split_clip: Scissors,
  trim_clip: Scissors, move_clip: Move, delete_clip: Trash2, analyze_audio: AudioLines, remove_silence: AudioLines,
  capture_frame: Camera, generate_subtitles: Captions, list_subtitles: Captions, edit_subtitle: Pencil,
  retime_subtitles: Clock, delete_subtitle: Trash2, export_subtitles: FileDown, import_subtitles: FileUp,
  clear_subtitles: Trash2, render_video: Film, ask_user: HelpCircle,
};
const toolIcon = (name: string) => TOOL_ICON[name] || Wrench;
const KIND_ICON = { video: FilmIcon, image: ImageIcon, audio: Music } as const;

interface ChatProps {
  media: MediaAsset[];
  onAddMedia: (files: FileList | File[] | null) => void;
  onClose: () => void;
  words: Word[] | null;
  clips: Clip[] | null;
  subs: Sub[] | null;
  projectId: string | null;
  onProject: (p: { words: Word[] | null; clips: Clip[] | null; subs: Sub[] | null }) => void;
}

export default function Chat({ media, onAddMedia, onClose, words, clips, subs, projectId, onProject }: ChatProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState<{ q: string; options: string[]; resolve: (v: string) => void } | null>(null);
  const [askText, setAskText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

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

  useEffect(() => {
    if (!projectId) return;
    setRestoredChat(false);
    (async () => {
      const c = await kvGet<{ items: Item[]; history: ChatMessage[] }>(pk(projectId, "chat"));
      runnerRef.current = null;
      savedHistory.current = c?.history || [];
      setItems((c?.items || []).filter((it) => it.kind !== "output"));
      setRestoredChat(true);
    })();
  }, [projectId]);

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
          setItems((p) => [...p, { kind: "tool", id: call.id, name: call.name, label: m?.label || call.name, color: m?.color || "#5c6470", status: "מתחיל…", state: "running", summary: "", time: now() }]);
        },
        onToolStatus: (id, status) => setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, status } : it))),
        onToolEnd: (id, ok, summary) => {
          setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, state: ok ? "ok" : "error", status: ok ? "הושלם" : "שגיאה", summary } : it)));
          const c = ctxRef.current;
          onProjectRef.current({ words: c.words, clips: c.clips, subs: c.subs });
        },
        onError: (msg) => setItems((p) => [...p, { kind: "error", text: msg, time: now() }]),
        onDone: () => setRunning(false),
      });
      if (savedHistory.current.length) runnerRef.current.history = savedHistory.current;
    }
    runnerRef.current.provider = provider;
    return runnerRef.current;
  }

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    if (running) {
      setItems((p) => [...p, { kind: "user", text, time: now() }]);
      setInput("");
      runnerRef.current?.injectMessage(text);
      return;
    }
    if (!configured[provider]) { setItems((p) => [...p, { kind: "error", text: `לספק ${PROVIDER_LABELS[provider]} אין מפתח ב-Vercel. ראה הגדרות.`, time: now() }]); return; }
    setItems((p) => [...p, { kind: "user", text, time: now() }]);
    setInput(""); setRunning(true);
    getRunner().send(text);
  };

  const changeProvider = (p: Provider) => { setProvider(p); localStorage.setItem(PROVIDER_PREF, p); if (runnerRef.current) runnerRef.current.provider = p; };
  const copy = (t: string, i: number) => { navigator.clipboard?.writeText(t); setCopied(i); setTimeout(() => setCopied((c) => (c === i ? null : c)), 1200); };
  const attachRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="panel-header">
        <span className="title"><Bot size={15} strokeWidth={1.75} />סוכן AI</span>
        <div className="actions" style={{ gap: 6 }}>
          <select value={provider} onChange={(e) => changeProvider(e.target.value as Provider)}
            style={{ width: "auto", height: 26, padding: "0 6px", fontSize: 12 }}>
            {(["deepseek", "openai", "anthropic", "gemini"] as Provider[]).map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}{configured[p] ? "" : " —"}</option>
            ))}
          </select>
          <button className="iconbtn" data-tip="סגור" data-tippos="down" onClick={onClose} aria-label="סגור"><X size={16} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="chat-body2" ref={scrollRef}>
        {items.length === 0 && (
          <div className="chat-empty2">
            העלה קבצים ותאר מה לעשות — למשל: “השאר רק את הקטע על X”, “תמלל והכן כתוביות”, “הסר שתיקות ונשימות”.
          </div>
        )}
        {items.map((it, i) => {
          if (it.kind === "tool") {
            const Icon = toolIcon(it.name);
            return (
              <div key={i} className="tool2">
                <span className="ic" style={{ background: it.color + "22", color: it.color }}><Icon size={15} strokeWidth={1.75} /></span>
                <div className="tx">
                  <div className="nm" style={{ color: it.color }}>{it.label}</div>
                  <div className="st">{it.state === "running" ? it.status : it.summary || it.status}</div>
                </div>
                <span className="stt">
                  {it.state === "running" && <Loader2 size={15} className="spin" style={{ color: "var(--accent)" }} />}
                  {it.state === "ok" && <Check size={15} className="stt ok" />}
                  {it.state === "error" && <AlertTriangle size={15} className="stt err" />}
                </span>
              </div>
            );
          }
          if (it.kind === "output") {
            return (
              <div key={i} className="out2">
                <div className="oh">
                  {it.mkind === "video" ? <Film size={14} /> : it.mkind === "image" ? <ImageIcon size={14} /> : <Captions size={14} />}
                  {it.mkind === "video" ? "סרטון מוכן" : it.mkind === "image" ? "פריים" : "כתוביות SRT"}
                </div>
                {it.mkind === "video" && <video src={it.url} controls />}
                {it.mkind === "image" && <img src={it.url} alt="frame" />}
                <a className="btn primary sm" href={it.url} download={it.name}><Download size={14} strokeWidth={2} />הורד {it.name}</a>
              </div>
            );
          }
          return (
            <div key={i} className={`msg2 ${it.kind}`}>
              <div className="b">
                {it.kind === "error" && <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginInlineEnd: 6, color: "var(--danger)" }} />}
                {it.text}
                <button className="cp" onClick={() => copy(it.text, i)} aria-label="העתק">{copied === i ? <Check size={13} /> : <Copy size={13} />}</button>
              </div>
              <span className="t">{it.time}</span>
            </div>
          );
        })}
        {ask && (
          <div className="ask2">
            <div className="q">{ask.q}</div>
            <div className="opts">{ask.options.map((o, i) => (<button key={i} className="btn sm" onClick={() => { ask.resolve(o); setAsk(null); setAskText(""); }}>{o}</button>))}</div>
            <div className="free">
              <input value={askText} onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && askText.trim()) { ask.resolve(askText.trim()); setAsk(null); setAskText(""); } }}
                placeholder="או כתוב תשובה משלך…" />
              <button className="btn primary sm" disabled={!askText.trim()} onClick={() => { ask.resolve(askText.trim()); setAsk(null); setAskText(""); }}>שלח</button>
            </div>
          </div>
        )}
      </div>

      {media.length > 0 && (
        <div className="chat-mentions">
          {media.map((m) => { const Icon = KIND_ICON[m.kind]; return (
            <button key={m.id} title={m.name} onClick={() => setInput((v) => `${v}@${m.name} `)}>
              <Icon size={12} strokeWidth={1.75} />{m.name.length > 14 ? m.name.slice(0, 13) + "…" : m.name}
            </button>
          ); })}
        </div>
      )}

      <div className="chat-compose">
        <button className="iconbtn lg" data-tip="העלה קובץ" data-tippos="up" onClick={() => attachRef.current?.click()} aria-label="העלה קובץ"><Paperclip size={16} strokeWidth={1.75} /></button>
        <input ref={attachRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { onAddMedia(e.target.files); e.currentTarget.value = ""; }} />
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={running ? "עדכן את הסוכן תוך כדי עבודה…" : "כתוב הוראה לסוכן…"} rows={1} />
        {running
          ? <><button className="btn primary" onClick={submit} disabled={!input.trim()} data-tip="עדכן" data-tippos="up"><Send size={15} strokeWidth={2} /></button>
             <button className="iconbtn lg danger" onClick={() => runnerRef.current?.stop()} data-tip="עצור" data-tippos="up" aria-label="עצור"><Square size={15} strokeWidth={2} /></button></>
          : <button className="btn primary" onClick={submit} disabled={!input.trim()} data-tip="שלח" data-tippos="up"><Send size={15} strokeWidth={2} /></button>}
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentRunner } from "@/lib/agent/runtime";
import { AgentContext, TOOL_BY_NAME } from "@/lib/agent/tools";
import { AgentMode, Provider, PROVIDER_LABELS } from "@/lib/agent/types";
import { repairToolMessages } from "@/lib/agent/normalize";
import { PROVIDER_PREF } from "@/lib/keys";
import { Word } from "@/lib/models";
import { Clip, MediaAsset, firstVideo } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize, defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { kvGet, kvSet, pk } from "@/lib/storage";
import { ChatMessage } from "@/lib/agent/types";
import {
  Bot, X, Send, Square, Paperclip, Copy, Check, AlertTriangle, Loader2, Film as FilmIcon, Music, Image as ImageIcon,
  Scissors, Trash2, Plus, Move, Search, Type, Layers, AudioLines, Camera, Captions, Pencil, Clock, FileDown, FileUp,
  HelpCircle, Info, Wrench, Film, Download, Eye, ClipboardList, Wand2, AtSign, MapPin, SquareDashedMousePointer,
  PanelLeftClose, PanelRightClose,
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

// שלושת מצבי הסוכן — Ask/Plan אינם מקבלים כלים (אכיפה ב-runtime), Act מבצע.
const MODES: { id: AgentMode; label: string; icon: LucideIcon; tip: string }[] = [
  { id: "ask", label: "Ask", icon: Eye, tip: "שאלות והסברים — ללא שינוי בפרויקט" },
  { id: "plan", label: "Plan", icon: ClipboardList, tip: "תכנון עריכה — ללא ביצוע" },
  { id: "act", label: "Act", icon: Wand2, tip: "ביצוע עריכות בפועל" },
];

// פקודות Slash. enabled=false מוצג מעומעם עם סיבה (בלי להעמיד פנים שעובד).
interface SlashCmd { cmd: string; label: string; icon: LucideIcon; enabled: boolean; reason?: string; kind: "mode" | "prompt"; mode?: AgentMode; template?: string; }
const SLASH: SlashCmd[] = [
  { cmd: "/ask", label: "מצב שאלות", icon: Eye, enabled: true, kind: "mode", mode: "ask" },
  { cmd: "/plan", label: "מצב תכנון", icon: ClipboardList, enabled: true, kind: "mode", mode: "plan" },
  { cmd: "/act", label: "מצב ביצוע", icon: Wand2, enabled: true, kind: "mode", mode: "act" },
  { cmd: "/transcribe", label: "תמלל את הסרטון", icon: Type, enabled: true, kind: "prompt", template: "תמלל את הסרטון הראשי." },
  { cmd: "/captions", label: "צור כתוביות", icon: Captions, enabled: true, kind: "prompt", template: "צור כתוביות מהתמלול על הציר." },
  { cmd: "/clean", label: "נקה שתיקות ונשימות", icon: AudioLines, enabled: true, kind: "prompt", template: "הסר שתיקות ונשימות מהסרטון." },
  { cmd: "/edit", label: "ערוך לפי סקריפט", icon: Scissors, enabled: true, kind: "prompt", template: "השאר רק את החלקים הבאים לפי הסקריפט: " },
  { cmd: "/export", label: "רנדר וייצא", icon: Film, enabled: true, kind: "prompt", template: "רנדר וייצא את הווידאו הערוך." },
  { cmd: "/export-srt", label: "ייצא כתוביות SRT", icon: FileDown, enabled: true, kind: "prompt", template: "ייצא את הכתוביות כקובץ SRT." },
  { cmd: "/help", label: "מה אתה יכול לעשות", icon: HelpCircle, enabled: true, kind: "prompt", template: "מה אתה יכול לעשות בפרויקט הזה?" },
  { cmd: "/generate-image", label: "צור תמונה", icon: ImageIcon, enabled: false, reason: "אין ספק תמונות מחובר (חבילה עתידית)", kind: "prompt" },
  { cmd: "/generate-voice", label: "צור קול", icon: AudioLines, enabled: false, reason: "אין ספק קול מחובר (חבילה עתידית)", kind: "prompt" },
  { cmd: "/generate-video", label: "צור וידאו", icon: FilmIcon, enabled: false, reason: "אין ספק וידאו מחובר (חבילה עתידית)", kind: "prompt" },
];

interface ChatProps {
  media: MediaAsset[];
  onAddMedia: (files: FileList | File[] | null) => void;
  onClose: () => void;
  words: Word[] | null;
  clips: Clip[] | null;
  subs: Sub[] | null;
  overlays?: Overlay[];
  canvas?: CanvasSize;
  projectId: string | null;
  onProject: (p: { words: Word[] | null; clips: Clip[] | null; subs: Sub[] | null }) => void;
  // הקשר עריכה חי (context chips + mention resolution)
  playhead?: number;
  selectionLabel?: string | null;
  // עגינה
  dockSide?: "left" | "right";
  onToggleDock?: () => void;
}

const fmtTc = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Chat({ media, onAddMedia, onClose, words, clips, subs, overlays = [], canvas, projectId, onProject, playhead = 0, selectionLabel, dockSide = "right", onToggleDock }: ChatProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState<{ q: string; options: string[]; resolve: (v: string) => void } | null>(null);
  const [askText, setAskText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [mode, setMode] = useState<AgentMode>("act");
  // popup לפקודות/אזכורים בזמן הקלדה ב-Composer
  const [pop, setPop] = useState<{ kind: "slash" | "mention"; query: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const m = localStorage.getItem("hs_agentmode"); if (m === "ask" || m === "plan" || m === "act") setMode(m); }, []);
  const changeMode = (m: AgentMode) => { setMode(m); localStorage.setItem("hs_agentmode", m); if (runnerRef.current) runnerRef.current.mode = m; };

  // ישויות זמינות ל-@mention (נבנות מהפרויקט האמיתי — ללא Mock)
  const mentionItems = useMemo(() => {
    const out: { token: string; label: string; icon: LucideIcon; hint?: string }[] = [
      { token: "@project", label: "הפרויקט כולו", icon: Layers },
      { token: "@playhead", label: `ראש-הנגן (${fmtTc(playhead)})`, icon: MapPin },
    ];
    if (selectionLabel) out.push({ token: "@selection", label: `הבחירה (${selectionLabel})`, icon: SquareDashedMousePointer });
    if (clips?.length) out.push({ token: "@timeline", label: `הציר (${clips.length} קטעים)`, icon: Film });
    if (subs?.length) out.push({ token: "@captions", label: `כתוביות (${subs.length})`, icon: Captions });
    for (const m of media) out.push({ token: `@${m.name}`, label: m.name, icon: KIND_ICON[m.kind], hint: m.kind });
    return out;
  }, [media, clips, subs, selectionLabel, playhead]);

  const addOutput = (blob: Blob, name: string, mkind: "video" | "srt" | "image") =>
    setItems((p) => [...p, { kind: "output", name, url: URL.createObjectURL(blob), mkind, time: now() }]);

  const ctxRef = useRef<AgentContext>({
    media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null,
    overlays: [], canvas: defaultCanvasFor(), lastRender: null,
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
    c.overlays = overlays; c.canvas = canvas || defaultCanvasFor();
  }, [media, words, clips, subs, overlays, canvas]);

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
      if (savedHistory.current.length) runnerRef.current.history = repairToolMessages(savedHistory.current);
    }
    runnerRef.current.provider = provider;
    runnerRef.current.mode = mode;
    return runnerRef.current;
  }

  const submit = () => {
    let text = input.trim();
    if (!text) return;
    // פקודת Slash שנשלחה ישירות (בלי בחירה מה-popup)
    if (text.startsWith("/") && !text.includes(" ")) {
      const c = SLASH.find((s) => s.cmd === text.toLowerCase());
      if (c) {
        if (!c.enabled) { setItems((p) => [...p, { kind: "error", text: `הפקודה ${c.cmd} אינה זמינה: ${c.reason}`, time: now() }]); setInput(""); return; }
        if (c.kind === "mode" && c.mode) { changeMode(c.mode); setInput(""); return; }
        text = c.template || text;
      }
    }
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

  // --- Composer: זיהוי / (פקודות) ו-@ (אזכורים) בזמן הקלדה ---
  const onInputChange = (v: string) => {
    setInput(v);
    const ta = taRef.current;
    const caret = ta ? ta.selectionStart : v.length;
    const upto = v.slice(0, caret);
    if (/^\/[^\s]*$/.test(upto)) { setPop({ kind: "slash", query: upto.slice(1).toLowerCase() }); return; }
    const mm = upto.match(/(?:^|\s)@([^\s@]*)$/);
    if (mm) { setPop({ kind: "mention", query: mm[1].toLowerCase() }); return; }
    setPop(null);
  };
  const slashList = pop?.kind === "slash" ? SLASH.filter((s) => s.cmd.toLowerCase().includes(pop.query) || s.label.includes(pop.query)) : [];
  const mentionList = pop?.kind === "mention" ? mentionItems.filter((m) => m.token.toLowerCase().includes(pop.query) || m.label.toLowerCase().includes(pop.query)) : [];
  const applySlash = (c: SlashCmd) => {
    if (!c.enabled) return;
    setPop(null);
    if (c.kind === "mode" && c.mode) { changeMode(c.mode); setInput(""); taRef.current?.focus(); return; }
    const t = c.template || "";
    setInput(t);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = t.length; } });
  };
  const applyMention = (token: string) => {
    const ta = taRef.current; const caret = ta ? ta.selectionStart : input.length;
    const upto = input.slice(0, caret); const rest = input.slice(caret);
    const replaced = upto.replace(/(^|\s)@([^\s@]*)$/, (_m, pre) => `${pre}${token} `);
    setInput(replaced + rest); setPop(null);
    requestAnimationFrame(() => { const t = taRef.current; if (t) { t.focus(); t.selectionStart = t.selectionEnd = replaced.length; } });
  };
  const onComposerKey = (e: React.KeyboardEvent) => {
    if (pop) {
      if (e.key === "Escape") { e.preventDefault(); setPop(null); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        if (pop.kind === "slash" && slashList[0]) { e.preventDefault(); applySlash(slashList.find((s) => s.enabled) || slashList[0]); return; }
        if (pop.kind === "mention" && mentionList[0]) { e.preventDefault(); applyMention(mentionList[0].token); return; }
      }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <>
      <div className="panel-header">
        <span className="title"><Bot size={15} strokeWidth={1.75} />סוכן AI</span>
        <div className="actions" style={{ gap: 4 }}>
          <select value={provider} onChange={(e) => changeProvider(e.target.value as Provider)} data-tip="ספק / מודל" data-tippos="down"
            style={{ width: "auto", height: 26, padding: "0 6px", fontSize: 12 }}>
            {(["deepseek", "openai", "anthropic", "gemini"] as Provider[]).map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}{configured[p] ? "" : " —"}</option>
            ))}
          </select>
          {onToggleDock && (
            <button className="iconbtn" data-tip={dockSide === "right" ? "עגן משמאל" : "עגן מימין"} data-tippos="down"
              onClick={onToggleDock} aria-label="החלף צד עגינה">
              {dockSide === "right" ? <PanelLeftClose size={16} strokeWidth={1.75} /> : <PanelRightClose size={16} strokeWidth={1.75} />}
            </button>
          )}
          <button className="iconbtn" data-tip="סגור" data-tippos="down" onClick={onClose} aria-label="סגור"><X size={16} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="agent-modes" role="tablist" aria-label="מצב סוכן">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className={`mode-tab ${mode === m.id ? "on" : ""}`}
            data-tip={m.tip} data-tippos="down" onClick={() => changeMode(m.id)}>
            <m.icon size={13} strokeWidth={1.9} />{m.label}
          </button>
        ))}
      </div>

      <div className="agent-ctx" aria-label="הקשר נוכחי">
        <span className="ctx-chip"><MapPin size={11} strokeWidth={2} />{fmtTc(playhead)}</span>
        {selectionLabel
          ? <span className="ctx-chip on" title={selectionLabel}><SquareDashedMousePointer size={11} strokeWidth={2} />{selectionLabel.length > 18 ? selectionLabel.slice(0, 17) + "…" : selectionLabel}</span>
          : <span className="ctx-chip muted"><SquareDashedMousePointer size={11} strokeWidth={2} />אין בחירה</span>}
        {clips?.length ? <span className="ctx-chip"><Film size={11} strokeWidth={2} />{clips.length}</span> : null}
        {subs?.length ? <span className="ctx-chip"><Captions size={11} strokeWidth={2} />{subs.length}</span> : null}
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

      <div className="composer">
        {pop && pop.kind === "slash" && slashList.length > 0 && (
          <div className="cmd-pop" role="listbox" aria-label="פקודות">
            {slashList.map((c) => (
              <button key={c.cmd} role="option" className={`cmd-item ${c.enabled ? "" : "disabled"}`}
                disabled={!c.enabled} title={c.reason || ""} onClick={() => applySlash(c)}>
                <c.icon size={14} strokeWidth={1.75} />
                <span className="cmd-name">{c.cmd}</span>
                <span className="cmd-desc">{c.enabled ? c.label : c.reason}</span>
              </button>
            ))}
          </div>
        )}
        {pop && pop.kind === "mention" && mentionList.length > 0 && (
          <div className="cmd-pop" role="listbox" aria-label="אזכורים">
            {mentionList.slice(0, 8).map((m) => (
              <button key={m.token} role="option" className="cmd-item" onClick={() => applyMention(m.token)}>
                <m.icon size={14} strokeWidth={1.75} />
                <span className="cmd-name">{m.token}</span>
                <span className="cmd-desc">{m.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="chat-compose">
          <button className="iconbtn lg" data-tip="העלה קובץ" data-tippos="up" onClick={() => attachRef.current?.click()} aria-label="העלה קובץ"><Paperclip size={16} strokeWidth={1.75} /></button>
          <input ref={attachRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { onAddMedia(e.target.files); e.currentTarget.value = ""; }} />
          <button className="iconbtn lg" data-tip="פקודה (/)" data-tippos="up" onClick={() => { setInput("/"); setPop({ kind: "slash", query: "" }); taRef.current?.focus(); }} aria-label="פקודות"><Wand2 size={16} strokeWidth={1.75} /></button>
          <button className="iconbtn lg" data-tip="אזכור (@)" data-tippos="up" onClick={() => { setInput((v) => v + (v && !v.endsWith(" ") ? " @" : "@")); setPop({ kind: "mention", query: "" }); taRef.current?.focus(); }} aria-label="אזכורים"><AtSign size={16} strokeWidth={1.75} /></button>
          <textarea ref={taRef} value={input} onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onComposerKey} onBlur={() => setTimeout(() => setPop(null), 120)}
            placeholder={running ? "עדכן את הסוכן תוך כדי עבודה…" : mode === "ask" ? "שאל על הפרויקט…  /  @  לאזכור" : mode === "plan" ? "תאר מה לתכנן…  /  @  לאזכור" : "כתוב הוראה…  /  לפקודה,  @  לאזכור"} rows={1} />
          {running
            ? <><button className="btn primary" onClick={submit} disabled={!input.trim()} data-tip="עדכן" data-tippos="up"><Send size={15} strokeWidth={2} /></button>
               <button className="iconbtn lg danger" onClick={() => runnerRef.current?.stop()} data-tip="עצור" data-tippos="up" aria-label="עצור"><Square size={15} strokeWidth={2} /></button></>
            : <button className="btn primary" onClick={submit} disabled={!input.trim()} data-tip="שלח" data-tippos="up"><Send size={15} strokeWidth={2} /></button>}
        </div>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentRunner } from "@/lib/agent/runtime";
import { AgentContext, TOOL_BY_NAME } from "@/lib/agent/tools";
import { EditorApi } from "@/lib/editor/commands";
import { TrackMeta, defaultTracks } from "@/lib/editor/project";
import { AgentMode, AgentUsage, Provider, PROVIDER_LABELS } from "@/lib/agent/types";
import { repairToolMessages } from "@/lib/agent/normalize";
import { LLM_PROVIDERS } from "@/lib/providers/registry";
import { PROVIDER_PREF } from "@/lib/keys";
import { Word } from "@/lib/models";
import { Clip, MediaAsset, firstVideo } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize, defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { CaptionStyle } from "@/lib/editor/captionStyle";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { kvGet, kvSet, pk } from "@/lib/storage";
import { ChatMessage } from "@/lib/agent/types";
import { collapseConsecutiveTools, toolGroupSummary, toolGroupTitle } from "@/lib/agent/collapseTools";
import { approvedPlanPrompt, parsePlanSteps } from "@/lib/agent/planApproval";
import {
  activeConversation, addConversation, ChatItem, ChatStoreV2, emptyStore, migrateChatStore, removeConversation,
  pinnedConversationCount, renameConversation, setConversationPinned, sortConversations, switchConversation, upsertActive,
} from "@/lib/agent/chatStore";
import { formatQuoteTime, quotePlaceText } from "@/lib/editor/time";
import {
  MessageCircle, X, Send, Square, Paperclip, Copy, Check, AlertTriangle, Loader2, Film as FilmIcon, Music, Image as ImageIcon,
  Scissors, Trash2, Plus, Move, Search, Type, Layers, AudioLines, Camera, Captions, Pencil, Clock, FileDown, FileUp,
  HelpCircle, Info, Wrench, Film, Download, Eye, ClipboardList, Palette, AtSign, MapPin, SquareDashedMousePointer,
  PanelLeftClose, PanelRightClose, MessageSquarePlus, Quote, Command, Play, ChevronDown, Sparkles, Settings, Lock, List, Pin, Robot,
} from "@/components/icons";
import ChatMarkdown from "@/components/ChatMarkdown";
import ChatMediaCard from "@/components/ChatMediaCard";
import { UploadProgressCard } from "@/components/LoadingState";
import type { TransferProgress } from "@/lib/ui/progress";
import { type AppIcon } from "@/components/icons";
import type { MutableRefObject } from "react";
import { conversationPinLimit } from "@/lib/billing/conversationLimits";
import { toast } from "@/lib/ui/toast";
import { addComposerReference, serializeComposerMessage, type ComposerReference } from "@/lib/chat/composerReferences";

type Item = ChatItem;
type ToolItem = Extract<Item, { kind: "tool" }>;

const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// tool name -> icon (single consistent family; falls back to a generic wrench).
const TOOL_ICON: Record<string, AppIcon> = {
  get_video_info: Info, list_media: Layers, rename_media: Pencil, transcribe_video: Type, find_in_transcript: Search, get_transcript: Type,
  transcribe_timeline: Type,
  keep_by_script: Scissors, remove_segments: Scissors, add_clip: Plus, list_clips: Layers, split_clip: Scissors,
  trim_clip: Scissors, move_clip: Move, delete_clip: Trash2, delete_clips: Trash2, keep_source_range: Scissors,
  clear_clips: Trash2, set_clip_enabled: Eye, set_clip_volume: AudioLines, set_clip_color: Palette,
  list_overlays: Layers, add_text_overlay: Type, delete_overlay: Trash2, update_overlay: Pencil,
  analyze_audio: AudioLines, remove_silence: AudioLines,
  capture_frame: Camera, generate_subtitles: Captions, list_subtitles: Captions, edit_subtitle: Pencil,
  retime_subtitles: Clock, delete_subtitle: Trash2, export_subtitles: FileDown, import_subtitles: FileUp,
  clear_subtitles: Trash2, render_video: Film, ask_user: HelpCircle,
};
const toolIcon = (name: string) => TOOL_ICON[name] || Wrench;
const KIND_ICON = { video: FilmIcon, image: ImageIcon, audio: Music } as const;

// שלושת מצבי הסוכן — Ask/Plan אינם מקבלים כלים (אכיפה ב-runtime), Act מבצע.
const MODES: { id: AgentMode; label: string; icon: AppIcon; tip: string }[] = [
  { id: "ask", label: "שאל", icon: Eye, tip: "שאלות והסברים — ללא שינוי בפרויקט" },
  { id: "plan", label: "תכנן", icon: ClipboardList, tip: "תכנון עריכה — ללא ביצוע" },
  { id: "act", label: "בצע", icon: Play, tip: "ביצוע עריכות בפועל" },
];

// פקודות Slash. enabled=false מוצג מעומעם עם סיבה (בלי להעמיד פנים שעובד).
interface SlashCmd { cmd: string; label: string; icon: AppIcon; enabled: boolean; reason?: string; kind: "mode" | "prompt"; mode?: AgentMode; template?: string; }
const SLASH: SlashCmd[] = [
  { cmd: "/ask", label: "מצב שאלות", icon: Eye, enabled: true, kind: "mode", mode: "ask" },
  { cmd: "/plan", label: "מצב תכנון", icon: ClipboardList, enabled: true, kind: "mode", mode: "plan" },
  { cmd: "/act", label: "מצב ביצוע", icon: Play, enabled: true, kind: "mode", mode: "act" },
  { cmd: "/transcribe", label: "תמלל את הסרטון", icon: Type, enabled: true, kind: "prompt", template: "תמלל את הסרטון הראשי." },
  { cmd: "/captions", label: "צור כתוביות", icon: Captions, enabled: true, kind: "prompt", template: "צור כתוביות מסונכרנות לקצב הדיבור לפי הטקסט הנקי שנתתי (generate_subtitles עם script). אל תשאיר שיבושי ASR." },
  { cmd: "/new", label: "שיחה חדשה", icon: MessageSquarePlus, enabled: true, kind: "prompt", template: "" },
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
  onAddMedia: (files: FileList | File[] | null, onProgress?: (ratio: number) => void) => boolean | void | Promise<boolean | void>;
  onClose: () => void;
  words: Word[] | null;
  clips: Clip[] | null;
  subs: Sub[] | null;
  /** סקריפט נקי מהפאנל — מקור אמת לכתוביות */
  script?: string;
  overlays?: Overlay[];
  canvas?: CanvasSize;
  /** סגנון כתוביות נוכחי — משמש את capture_frame (timeline=true) לצריבת כתוביות */
  captionStyle?: CaptionStyle;
  projectId: string | null;
  onProject: (p: {
    words: Word[] | null;
    clips: Clip[] | null;
    subs: Sub[] | null;
    overlays?: Overlay[];
    tracks?: TrackMeta[];
    viaEditor?: boolean;
  }) => void;
  /** גשר CommandBus — עדכון מיידי בעורך בזמן כלי-סוכן */
  editorApi?: EditorApi | null;
  tracks?: TrackMeta[];
  // הקשר עריכה חי (context chips + mention resolution)
  playhead?: number;
  selectionLabel?: string | null;
  // עגינה
  dockSide?: "left" | "right";
  onToggleDock?: () => void;
  /** רישום פונקציה להכנסת ציטוט-מקום מצפייה/כפתור */
  quoteSink?: MutableRefObject<((seconds: number) => void) | null>;
  /** ציטוט שממתין עד שתיבת הצ'אט נטענת (כשהפאנל היה סגור) */
  pendingQuoteRef?: MutableRefObject<number | null>;
  /** גשר מפאנל המדיה להכנסת אזכור קובץ יציב לתיבת ההודעה */
  mentionSink?: MutableRefObject<((asset: MediaAsset) => void) | null>;
  pendingMentionRef?: MutableRefObject<MediaAsset | null>;
  /** הייצוא האחרון מהעורך — מוצמד בראש רשימת ההודעות */
  latestExport?: { url: string; name: string; size: number } | null;
}

const fmtTc = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const REF_TOKEN = /(\[ציטוט\s+[^\]]+\]|@media:[\w-]+)/g;
function ChatUserText({ text }: { text: string }) {
  return <>{text.split(REF_TOKEN).map((part, index) => /^(?:\[ציטוט\s+[^\]]+\]|@media:[\w-]+)$/.test(part)
    ? <span className="chat-inline-ref" key={`${part}-${index}`}>{part.startsWith("[ציטוט") ? <Quote size={11} /> : <AtSign size={11} />}{part}</span>
    : part)}</>;
}
const COMPOSE_H_KEY = "hs_compose_h";
const COMPOSE_H_DEFAULT = 82;
const COMPOSE_H_MIN = 64;
const COMPOSE_H_MAX = 280;

export default function Chat({ media, onAddMedia, onClose, words, clips, subs, script = "", overlays = [], canvas, projectId, onProject, editorApi = null, tracks = [], playhead = 0, selectionLabel, dockSide = "right", onToggleDock, quoteSink, pendingQuoteRef, mentionSink, pendingMentionRef, captionStyle, latestExport }: ChatProps) {
  const [store, setStore] = useState<ChatStoreV2>(() => emptyStore());
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [composerReferences, setComposerReferences] = useState<ComposerReference[]>([]);
  const [running, setRunning] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [usage, setUsage] = useState<AgentUsage>({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  const [canChooseProvider, setCanChooseProvider] = useState(false);
  const [providerMode, setProviderMode] = useState<"managed" | "byok">("managed");
  const [byokOpen, setByokOpen] = useState(false);
  const [byokProviders, setByokProviders] = useState<Provider[]>([]);
  const [byokDraft, setByokDraft] = useState<Partial<Record<Provider, string>>>({});
  const [byokBusy, setByokBusy] = useState<Provider | null>(null);
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false);
  const [uploading, setUploading] = useState<TransferProgress | null>(null);
  const [ask, setAsk] = useState<{ q: string; options: string[]; resolve: (v: string) => void } | null>(null);
  const [askText, setAskText] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [mode, setMode] = useState<AgentMode>("act");
  const [pop, setPop] = useState<{ kind: "slash" | "mention"; query: string } | null>(null);
  const [composeH, setComposeH] = useState(COMPOSE_H_DEFAULT);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("");
  const [pinLimit, setPinLimit] = useState(5);
  const composeHRef = useRef(COMPOSE_H_DEFAULT);
  const suggestionFetchedKeyRef = useRef("");
  composeHRef.current = composeH;
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const useTourExample = (event: Event) => {
      const text = String((event as CustomEvent<string>).detail || "").trim();
      if (!text) return;
      setInput(text);
      window.setTimeout(() => taRef.current?.focus(), 0);
    };
    window.addEventListener("hypescript:chat-example", useTourExample);
    return () => window.removeEventListener("hypescript:chat-example", useTourExample);
  }, []);
  useEffect(() => {
    if (!threadsOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setThreadsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [threadsOpen]);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    const h = parseInt(localStorage.getItem(COMPOSE_H_KEY) || "0", 10);
    if (h >= COMPOSE_H_MIN && h <= COMPOSE_H_MAX) setComposeH(h);
  }, []);

  const startResizeCompose = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = composeHRef.current;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(COMPOSE_H_MIN, Math.min(COMPOSE_H_MAX, startH + (startY - ev.clientY)));
      setComposeH(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      localStorage.setItem(COMPOSE_H_KEY, String(composeHRef.current));
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => { const m = localStorage.getItem("hs_agentmode"); if (m === "ask" || m === "plan" || m === "act") setMode(m); }, []);
  const changeMode = (m: AgentMode) => { setMode(m); localStorage.setItem("hs_agentmode", m); if (runnerRef.current) runnerRef.current.mode = m; };

  // ישויות זמינות ל-@mention (נבנות מהפרויקט האמיתי — ללא Mock)
  const mentionItems = useMemo(() => {
    const out: { token: string; label: string; icon: AppIcon; hint?: string }[] = [];
    for (const m of [...media].reverse()) out.push({ token: `@media:${m.id}`, label: m.name, icon: KIND_ICON[m.kind], hint: m.kind });
    out.push(
      { token: "@project", label: "הפרויקט כולו", icon: Layers },
      { token: "@playhead", label: `ראש-הנגן (${fmtTc(playhead)})`, icon: MapPin },
    );
    if (selectionLabel) out.push({ token: "@selection", label: `הבחירה (${selectionLabel})`, icon: SquareDashedMousePointer });
    if (clips?.length) out.push({ token: "@timeline", label: `הציר (${clips.length} קטעים)`, icon: Film });
    if (subs?.length) out.push({ token: "@captions", label: `כתוביות (${subs.length})`, icon: Captions });
    return out;
  }, [media, clips, subs, selectionLabel, playhead]);

  const addOutput = (blob: Blob, name: string, mkind: "video" | "srt" | "image" | "audio") =>
    setItems((p) => [...p, { kind: "output", name, url: URL.createObjectURL(blob), mkind, time: now() }]);

  const ctxRef = useRef<AgentContext>({
    media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null,
    overlays: [], tracks: defaultTracks(), canvas: defaultCanvasFor(), lastRender: null,
    captionStyle: null,
    editorApi: null,
    askUser: (q, options) => new Promise<string>((resolve) => setAsk({ q, options, resolve })),
    pendingImages: [],
  });
  const runnerRef = useRef<AgentRunner | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onProjectRef = useRef(onProject);
  onProjectRef.current = onProject;
  const savedHistory = useRef<ChatMessage[]>([]);
  const lastUserPromptRef = useRef("");
  const [restoredChat, setRestoredChat] = useState(false);

  const loadConversation = (next: ChatStoreV2) => {
    const active = activeConversation(next);
    runnerRef.current = null;
    savedHistory.current = active.history || [];
    setStore(next);
    setItems((active.items || []).filter((it) => it.kind !== "output"));
    setAsk(null);
    setInput("");
    setComposerReferences([]);
  };

  const startNewChat = () => {
    if (running) { runnerRef.current?.stop(); setRunning(false); }
    // שמירת השיחה הנוכחית לפני פתיחת חדשה
    const cur = upsertActive(storeRef.current, {
      items: items.filter((it) => it.kind !== "output"),
      history: runnerRef.current?.history || savedHistory.current,
    });
    loadConversation(addConversation(cur));
  };

  const selectChat = (id: string) => {
    if (id === store.activeId) return;
    if (running) { runnerRef.current?.stop(); setRunning(false); }
    const cur = upsertActive(storeRef.current, {
      items: items.filter((it) => it.kind !== "output"),
      history: runnerRef.current?.history || savedHistory.current,
    });
    loadConversation(switchConversation(cur, id));
    setThreadsOpen(false);
  };

  const persistConversationStore = (next: ChatStoreV2) => {
    storeRef.current = next;
    setStore(next);
    if (projectId) void kvSet(pk(projectId, "chat"), next);
  };
  const saveThreadTitle = (id: string) => {
    persistConversationStore(renameConversation(storeRef.current, id, threadTitle));
    setEditingThreadId(null); setThreadTitle("");
  };
  const deleteThread = (id: string) => {
    if (running) { runnerRef.current?.stop(); setRunning(false); }
    const current = upsertActive(storeRef.current, {
      items: items.filter((item) => item.kind !== "output"),
      history: runnerRef.current?.history || savedHistory.current,
    });
    const next = removeConversation(current, id);
    loadConversation(next);
    if (projectId) void kvSet(pk(projectId, "chat"), next);
  };
  const toggleThreadPin = (id: string) => {
    const conversation = storeRef.current.conversations.find((entry) => entry.id === id);
    if (!conversation) return;
    const nextPinned = !conversation.pinned;
    if (nextPinned && pinnedConversationCount(storeRef.current) >= pinLimit) {
      toast.info("מכסת השיחות הנעוצות מלאה", `במסלול שלך אפשר לנעוץ עד ${pinLimit} שיחות.`);
      return;
    }
    persistConversationStore(setConversationPinned(storeRef.current, id, nextPinned, pinLimit));
  };

  useEffect(() => {
    if (!projectId) return;
    setRestoredChat(false);
    (async () => {
      const raw = await kvGet<unknown>(pk(projectId, "chat"));
      loadConversation(migrateChatStore(raw));
      setRestoredChat(true);
    })();
  }, [projectId]);

  useEffect(() => {
    if (!restoredChat || !projectId) return;
    const t = setTimeout(() => {
      const history = runnerRef.current?.history || savedHistory.current;
      const next = upsertActive(storeRef.current, {
        items: items.filter((it) => it.kind !== "output"),
        history,
      });
      storeRef.current = next;
      // מעדכן כותרת ברשימת השיחות בלי לולאת רינדור מיותרת
      setStore((prev) => (prev.activeId === next.activeId ? next : prev));
      kvSet(pk(projectId, "chat"), next);
    }, 700);
    return () => clearTimeout(t);
  }, [items, restoredChat, projectId]);

  useEffect(() => {
    const c = ctxRef.current;
    c.media = media; c.duration = firstVideo(media)?.duration || 0; c.words = words;
    // בזמן כלי שכבר דחף ל-EditorApi — לא לדרוס את ctx מ-props ישנים באמצע הריצה
    if (!c._editorDirty) {
      c.clips = clips; c.subs = subs;
      c.overlays = overlays; c.tracks = tracks?.length ? tracks : defaultTracks();
    }
    c.canvas = canvas || defaultCanvasFor();
    c.editorApi = editorApi || null;
    c.captionStyle = captionStyle || null;
    if (script.trim()) c.script = script.trim();
  }, [media, words, clips, subs, overlays, tracks, canvas, script, editorApi, captionStyle]);

  useEffect(() => {
    setProvider(((localStorage.getItem(PROVIDER_PREF) as Provider) || "deepseek"));
    fetch("/api/providers/byok")
      .then((r) => r.ok ? r.json() : null)
      .then((access) => {
        const can = access?.canUseByok === true;
        const mode = access?.providerMode === "byok" && can ? "byok" : "managed";
        setCanChooseProvider(can);
        setProviderMode(mode);
        setByokProviders(Array.isArray(access?.providers) ? access.providers : []);
      })
      .finally(() => setEntitlementsLoaded(true));
  }, []);

  useEffect(() => {
    if (!entitlementsLoaded || providerMode !== "byok") return;
    if (byokProviders.includes(provider)) return;
    const fallback = LLM_PROVIDERS.find((candidate) => byokProviders.includes(candidate.id));
    if (!fallback) return;
    setProvider(fallback.id);
    localStorage.setItem(PROVIDER_PREF, fallback.id);
    if (runnerRef.current) runnerRef.current.provider = fallback.id;
  }, [entitlementsLoaded, provider, providerMode, byokProviders]);
  const displayItems = useMemo(() => collapseConsecutiveTools(items), [items]);
  const suggestionTurns = useMemo(() => items
    .filter((item) => item.kind === "user" || item.kind === "assistant")
    .slice(-10)
    .map((item) => ({ role: item.kind as "user" | "assistant", content: "text" in item ? item.text : "" })), [items]);
  const suggestionContext = useMemo(() => ({
    projectSummary: [
      media.length ? `מדיה: ${media.slice(0, 6).map((asset) => `${asset.name} (${asset.kind}, ${asset.duration.toFixed(0)} שניות)`).join(", ")}` : "אין מדיה",
      script.trim() ? `בריף או סקריפט: ${script.trim().replace(/\s+/g, " ").slice(0, 420)}` : "",
      canvas ? `פורמט: ${canvas.width}×${canvas.height}` : "",
      clips?.length ? `${clips.length} קטעים על ציר הזמן` : "",
      subs?.length ? `${subs.length} כתוביות` : "",
      overlays.length ? `${overlays.length} שכבות גרפיות` : "",
    ].filter(Boolean).join(" · "),
    availableCapabilities: [
      "חיתוך והידוק לפי טקסט", "הסרת שתיקות ונשימות", "כתוביות עברית מסונכרנות",
      "הוספת טקסט וכותרות", "תמונות ולוגו כשכבות", "קריינות ואודיו", "מוזיקת רקע מותאמת",
      "מעברים ואפקטים", "התאמה לרשתות חברתיות", "בדיקת העריכה", "ייצוא וידאו ו-SRT",
    ],
  }), [media, script, canvas, clips?.length, subs?.length, overlays.length]);
  const suggestionKey = useMemo(() => `${suggestionTurns.map((message) => `${message.role}:${message.content}`).join("\n")}\n${suggestionContext.projectSummary}`.slice(-7900), [suggestionTurns, suggestionContext.projectSummary]);
  // תמיד מציגים נקודות חשיבה כל עוד יש בקשה פתוחה (גם בזמן כלי רץ)
  const showThinking = running && !ask;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayItems, ask, showThinking]);

  useEffect(() => {
    if (running || input.trim() || !suggestionTurns.some((message) => message.role === "user") || !suggestionTurns.some((message) => message.role === "assistant")) {
      setSuggestionsLoading(false);
      if (!running && suggestionTurns.length < 2) setSuggestions([]);
      return;
    }
    if (suggestionFetchedKeyRef.current === suggestionKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      suggestionFetchedKeyRef.current = suggestionKey;
      setSuggestionsLoading(true);
      try {
        const response = await fetch("/api/agent/suggestions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ messages: suggestionTurns, context: suggestionContext, ...(providerMode === "byok" ? { provider } : {}) }),
        });
        const data = response.ok ? await response.json() : null;
        if (!controller.signal.aborted) setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 3) : []);
      } catch {
        if (!controller.signal.aborted) {
          suggestionFetchedKeyRef.current = "";
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [suggestionKey, suggestionContext, running, input, providerMode, provider]);

  // ציטוט מקום → לתיבת ההודעה (לא כהודעה בצ'אט). המשתמש שולח כשמוכן.
  const insertQuote = useCallback((seconds: number) => {
    const snippet = quotePlaceText(seconds);
    setComposerReferences((current) => addComposerReference(current, {
      token: snippet,
      label: `מיקום ${formatQuoteTime(seconds)}`,
      kind: "time",
    }));
    // אחרי שה-state מתעדכן — פוקוס לתיבה (גם אם הצ'אט זה עתה נפתח)
    setTimeout(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const end = ta.value.length;
      ta.selectionStart = ta.selectionEnd = end;
    }, 0);
  }, []);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((response) => response.ok ? response.json() : null)
      .then((status) => setPinLimit(conversationPinLimit(status?.subscription?.plan_id)))
      .catch(() => setPinLimit(conversationPinLimit("free")));
  }, []);

  const insertMediaMention = useCallback((asset: MediaAsset) => {
    const token = `@media:${asset.id}`;
    setComposerReferences((current) => addComposerReference(current, { token, label: asset.name, kind: "media" }));
    setPop(null);
    setTimeout(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length;
    }, 0);
  }, []);

  useEffect(() => {
    if (!quoteSink) return;
    quoteSink.current = insertQuote;
    // פלש ציטוט שממתין מפתיחת הפאנל
    if (pendingQuoteRef && pendingQuoteRef.current != null) {
      const s = pendingQuoteRef.current;
      pendingQuoteRef.current = null;
      insertQuote(s);
    }
    return () => {
      if (quoteSink.current === insertQuote) quoteSink.current = null;
    };
  }, [quoteSink, pendingQuoteRef, insertQuote]);

  useEffect(() => {
    if (!mentionSink) return;
    mentionSink.current = insertMediaMention;
    if (pendingMentionRef?.current) {
      const asset = pendingMentionRef.current;
      pendingMentionRef.current = null;
      insertMediaMention(asset);
    }
    return () => { if (mentionSink.current === insertMediaMention) mentionSink.current = null; };
  }, [mentionSink, pendingMentionRef, insertMediaMention]);

  function getRunner(): AgentRunner {
    if (!runnerRef.current) {
      runnerRef.current = new AgentRunner(provider, ctxRef.current, {
        onAssistant: (text, responseMode, meta) => setItems((p) => [...p, responseMode === "plan"
          ? { kind: "plan", id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, steps: parsePlanSteps(text), state: "pending", time: now() }
          : {
              kind: "assistant",
              text,
              time: now(),
              modelLabel: meta?.providerMode === "byok" && meta.model ? `${PROVIDER_LABELS[meta.provider]} · ${meta.model}` : undefined,
            }]),
        onToolStart: (call, toolProvider) => {
          const m = TOOL_BY_NAME[call.name];
            setItems((p) => [...p, { kind: "tool", id: call.id, name: call.name, label: m?.label || call.name, color: m?.color || "#5c6470", status: "מתחיל…", state: "running", summary: "", time: now(), providerLabel: providerMode === "byok" ? PROVIDER_LABELS[toolProvider] : undefined, args: { ...call.arguments }, startedAt: Date.now() }]);
        },
        onToolStatus: (id, status) => setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, status } : it))),
        onToolEnd: (id, ok, summary) => {
          setItems((p) => p.map((it) => (it.kind === "tool" && it.id === id ? { ...it, state: ok ? "ok" : "error", status: ok ? "הושלם" : "שגיאה", summary, durationMs: Math.max(0, Date.now() - (it.startedAt || Date.now())) } : it)));
          const c = ctxRef.current;
          const viaEditor = !!c._editorDirty;
          c._editorDirty = false;
          onProjectRef.current({
            words: c.words, clips: c.clips, subs: c.subs, overlays: c.overlays, tracks: c.tracks, viaEditor,
          });
        },
        onError: (msg) => setItems((p) => [...p, { kind: "error", text: msg, time: now() }]),
        onDone: () => setRunning(false),
        onUsage: (next) => setUsage((prev) => ({ inputTokens: prev.inputTokens + next.inputTokens, outputTokens: prev.outputTokens + next.outputTokens, totalTokens: prev.totalTokens + next.totalTokens })),
        onCheckpoint: (call, checkpoint) => setItems((p) => p.map((it) => it.kind === "tool" && it.id === call.id ? { ...it, checkpoint } : it)),
        onArtifact: (artifact) => addOutput(artifact.blob, artifact.name, artifact.kind),
      });
      if (savedHistory.current.length) runnerRef.current.history = repairToolMessages(savedHistory.current);
    }
    runnerRef.current.provider = provider;
    runnerRef.current.mode = mode;
    return runnerRef.current;
  }

  const sendAgentRequest = (text: string, selectedProvider: Provider = provider, displayText = text, references: ComposerReference[] = []) => {
    setItems((p) => [...p, { kind: "user", text: displayText, time: now(), references }]);
    lastUserPromptRef.current = text;
    setInput("");
    setComposerReferences([]);
    setRunning(true);
    const runner = getRunner();
    runner.provider = selectedProvider;
    runner.send(text);
  };

  const submit = () => {
    const displayText = input.trim();
    const sentReferences = composerReferences.map((reference) => ({ ...reference }));
    let text = serializeComposerMessage(input, composerReferences);
    if (!text) return;
    // פקודת Slash שנשלחה ישירות (בלי בחירה מה-popup)
    if (text.startsWith("/") && !text.includes(" ")) {
      const c = SLASH.find((s) => s.cmd === text.toLowerCase());
      if (c) {
        if (!c.enabled) { setItems((p) => [...p, { kind: "error", text: `הפקודה ${c.cmd} אינה זמינה: ${c.reason}`, time: now() }]); setInput(""); return; }
        if (c.cmd === "/new") { setInput(""); startNewChat(); return; }
        if (c.kind === "mode" && c.mode) { changeMode(c.mode); setInput(""); return; }
        text = c.template || text;
      }
    }
    if (running) {
      setItems((p) => [...p, { kind: "user", text: displayText, time: now(), references: sentReferences }]);
      lastUserPromptRef.current = text;
      setInput("");
      setComposerReferences([]);
      runnerRef.current?.injectMessage(text);
      return;
    }
    if (providerMode === "byok") {
      if (!entitlementsLoaded) { setItems((p) => [...p, { kind: "error", text: "בודק את הגדרות ה־BYOK. נסה שוב בעוד רגע.", time: now() }]); return; }
      if (!byokProviders.includes(provider)) { setItems((p) => [...p, { kind: "error", text: "יש לשמור מפתח לספק שנבחר בהגדרות ה־AI.", time: now() }]); setByokOpen(true); return; }
    }
    sendAgentRequest(text, provider, displayText, sentReferences);
  };

  const changeProvider = (p: Provider) => {
    if (providerMode === "byok" && !byokProviders.includes(p)) {
      setItems((prev) => [...prev, { kind: "error", text: "לספק הזה עדיין לא נשמר מפתח BYOK.", time: now() }]);
      return;
    }
    setProvider(p); localStorage.setItem(PROVIDER_PREF, p); if (runnerRef.current) runnerRef.current.provider = p;
  };
  const copy = (t: string, i: number) => { navigator.clipboard?.writeText(t); setCopied(i); setTimeout(() => setCopied((c) => (c === i ? null : c)), 1200); };
  const quoteMessage = (item: { kind: "user" | "assistant"; text: string; time: string }) => {
    const authorLabel = item.kind === "user" ? "אני" : "עוזר AI";
    const clean = item.text.trim();
    if (!clean) return;
    const preview = clean.replace(/\s+/g, " ").slice(0, 150);
    const token = `[ציטוט הודעה מאת ${authorLabel}, ${item.time}]\n${clean}\n[/ציטוט]`;
    setComposerReferences((current) => addComposerReference(current, {
      token,
      label: `הודעה של ${authorLabel}`,
      kind: "message",
      preview,
      author: item.kind,
      time: item.time,
    }));
    window.setTimeout(() => taRef.current?.focus(), 0);
  };
  const attachRef = useRef<HTMLInputElement>(null);
  const handleAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
    const startedAt = Date.now();
    const updateUpload = (ratio: number) => setUploading({ count: selected.length, fileName: selected[0].name, loadedBytes: totalBytes * ratio, totalBytes, ratio, startedAt });
    updateUpload(0);
    try {
      const uploaded = await Promise.resolve(onAddMedia(files, updateUpload));
      if (uploaded === false) {
        setUploading(null);
        return;
      }
      updateUpload(1);
      window.setTimeout(() => setUploading(null), 900);
    } catch {
      setUploading(null);
    }
  };

  const answerAsk = (value: string) => {
    if (!ask || !value.trim()) return;
    const clean = value.trim();
    setItems((prev) => [...prev, { kind: "user", text: `בחרתי: ${clean}`, time: now() }]);
    ask.resolve(clean);
    setAsk(null);
    setAskText("");
  };

  const retryTool = async (tool: ToolItem) => {
    if (!tool.args || running) return;
    setRunning(true);
    try { await getRunner().retryTool(tool.name, tool.args); }
    catch (e: any) { setItems((p) => [...p, { kind: "error", text: e?.message || "הניסיון החוזר נכשל.", time: now() }]); setRunning(false); }
  };
  const restoreToolCheckpoint = (tool: ToolItem) => {
    if (!tool.checkpoint || !editorApi?.restoreSnapshot) return;
    editorApi.restoreSnapshot(tool.checkpoint);
    setItems((p) => p.map((it) => it.kind === "tool" && it.id === tool.id ? { ...it, restored: true } : it));
  };
  const approvePlan = (plan: Extract<Item, { kind: "plan" }>) => {
    if (running || plan.state !== "pending") return;
    const command = approvedPlanPrompt(plan.text);
    setItems((p) => [
      ...p.map((it) => it.kind === "plan" && it.id === plan.id ? { ...it, state: "approved" as const } : it),
      { kind: "user", text: "התוכנית אושרה — בצע אותה.", time: now() } as Item,
    ]);
    changeMode("act");
    setRunning(true);
    const runner = getRunner();
    runner.mode = "act";
    runner.send(command);
  };
  const revisePlan = (plan: Extract<Item, { kind: "plan" }>) => {
    if (running || plan.state !== "pending") return;
    setItems((p) => p.map((it) => it.kind === "plan" && it.id === plan.id ? { ...it, state: "revision" as const } : it));
    changeMode("plan");
    setInput("עדכן את התוכנית הזו כך ש");
    requestAnimationFrame(() => taRef.current?.focus());
  };
  const saveByok = async (selected: Provider) => {
    const apiKey = String(byokDraft[selected] || "").trim();
    if (!apiKey) return;
    setByokBusy(selected);
    const response = await fetch("/api/providers/byok", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: selected, apiKey }) });
    setByokBusy(null);
    if (!response.ok) { setItems((p) => [...p, { kind: "error", text: response.status === 403 ? "BYOK זמין במסלול Pro פעיל." : "שמירת המפתח נכשלה.", time: now() }]); return; }
    setByokProviders((current) => current.includes(selected) ? current : [...current, selected]);
    setByokDraft((current) => ({ ...current, [selected]: "" }));
    setProvider(selected); localStorage.setItem(PROVIDER_PREF, selected);
  };

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
    if (c.cmd === "/new") { setInput(""); startNewChat(); return; }
    if (c.kind === "mode" && c.mode) { changeMode(c.mode); setInput(""); taRef.current?.focus(); return; }
    const t = c.template || "";
    setInput(t);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = t.length; } });
  };
  const applyMention = (token: string) => {
    const ta = taRef.current; const caret = ta ? ta.selectionStart : input.length;
    const upto = input.slice(0, caret); const rest = input.slice(caret);
    const item = mentionItems.find((mention) => mention.token === token);
    const replaced = upto.replace(/(^|\s)@([^\s@]*)$/, (_m, pre) => pre);
    setInput(replaced + rest);
    if (item) setComposerReferences((current) => addComposerReference(current, {
      token: item.token,
      label: item.label,
      kind: item.token.startsWith("@media:") ? "media" : "context",
    }));
    setPop(null);
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
        <div className="chat-header-leading"><span className="title"><MessageCircle size={15} strokeWidth={1.75} />עוזר העריכה</span></div>
        <div className="actions" style={{ gap: 4 }}>
          {!entitlementsLoaded && <span className="chat-header-skeleton skeleton-shimmer" aria-label="טוען הרשאות" />}
          {providerMode === "byok" && canChooseProvider && <label className="chat-model-picker" data-tip="ספק BYOK פעיל" data-tippos="down"><Sparkles size={13} /><span>BYOK</span><select value={provider} onChange={(e) => changeProvider(e.target.value as Provider)} aria-label="ספק BYOK לשיחה">
            {LLM_PROVIDERS.map((p) => {
              const disabled = !byokProviders.includes(p.id);
              return <option key={p.id} value={p.id} disabled={disabled}>{p.labelHe}{disabled ? " · חסר מפתח" : ""}</option>;
            })}
          </select><ChevronDown size={12} /></label>}
          {providerMode === "byok" && usage.totalTokens > 0 && <span className="mono" title={`קלט ${usage.inputTokens.toLocaleString()} · פלט ${usage.outputTokens.toLocaleString()}`} style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{usage.totalTokens.toLocaleString()} tok</span>}
          <button className="iconbtn" data-tip="הגדרות AI" data-tippos="down" onClick={() => setByokOpen((value) => !value)} aria-expanded={byokOpen} aria-label="הגדרות AI"><Settings size={16} /></button>
          {onToggleDock && (
            <button className="iconbtn" data-tip={dockSide === "right" ? "עגן משמאל" : "עגן מימין"} data-tippos="down"
              onClick={onToggleDock} aria-label="החלף צד עגינה">
              {dockSide === "right" ? <PanelLeftClose size={16} strokeWidth={1.75} /> : <PanelRightClose size={16} strokeWidth={1.75} />}
            </button>
          )}
          <button className="iconbtn" data-tip="סגור" data-tippos="down" onClick={onClose} aria-label="סגור"><X size={16} strokeWidth={1.75} /></button>
          <button className="iconbtn chat-history-trigger" data-tip="כל השיחות" data-tippos="down" onClick={() => setThreadsOpen(true)} aria-expanded={threadsOpen} aria-controls="chat-history-drawer" aria-label="פתח את כל השיחות"><List size={18} /></button>
        </div>
      </div>

      {threadsOpen && <div className="chat-history-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setThreadsOpen(false); }}>
        <aside className="chat-history-drawer" id="chat-history-drawer" role="dialog" aria-modal="true" aria-label="כל השיחות">
          <div className="chat-history-head">
            <div><strong>כל השיחות</strong><span>{store.conversations.length} שיחות · {pinnedConversationCount(store)}/{pinLimit} נעוצות</span></div>
            <button className="iconbtn" onClick={() => setThreadsOpen(false)} aria-label="סגור רשימת שיחות"><X size={16} /></button>
          </div>
          <button className="chat-history-new" onClick={() => { startNewChat(); setThreadsOpen(false); }}><MessageSquarePlus size={17} />שיחה חדשה</button>
          <div className="chat-thread-list" role="listbox" aria-label="שיחות קודמות">{sortConversations(store.conversations).map((conversation) => <div key={conversation.id} className={`chat-thread-row ${conversation.id === store.activeId ? "active" : ""} ${conversation.pinned ? "pinned" : ""}`}>
            {editingThreadId === conversation.id
              ? <input autoFocus value={threadTitle} onChange={(e) => setThreadTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveThreadTitle(conversation.id); if (e.key === "Escape") setEditingThreadId(null); }} onBlur={() => saveThreadTitle(conversation.id)} aria-label="שם השיחה" />
              : <button className="chat-thread-select" onClick={() => selectChat(conversation.id)} role="option" aria-selected={conversation.id === store.activeId}><span>{conversation.pinned && <Pin size={12} weight="fill" />}{conversation.title || "שיחה"}</span><time>{new Date(conversation.updatedAt).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}</time></button>}
            <button className={`chat-thread-action ${conversation.pinned ? "on" : ""}`} onClick={() => toggleThreadPin(conversation.id)} data-tip={conversation.pinned ? "בטל נעיצה" : "נעץ שיחה"} aria-label={conversation.pinned ? "בטל נעיצת שיחה" : "נעץ שיחה"} aria-pressed={!!conversation.pinned}><Pin size={14} weight={conversation.pinned ? "fill" : "regular"} /></button>
            <button className="chat-thread-action" onClick={() => { setEditingThreadId(conversation.id); setThreadTitle(conversation.title); }} data-tip="שינוי שם" aria-label="שנה שם"><Pencil size={14} /></button>
            <button className="chat-thread-action danger" onClick={() => deleteThread(conversation.id)} data-tip="מחיקת שיחה" aria-label="מחק שיחה"><Trash2 size={14} /></button>
          </div>)}</div>
          <div className="chat-history-foot">נעוצות נשארות בראש הרשימה. <a href="/account#plans">הגדלת המכסה</a></div>
        </aside>
      </div>}

      {byokOpen && <section className="chat-ai-settings" aria-label="הגדרות AI">
        <div className="chat-ai-settings-head"><div><strong>{providerMode === "managed" ? "AI מנוהל" : "BYOK פעיל"}</strong><span>{providerMode === "managed" ? "Hypescript בוחר אוטומטית שירות זמין. אין צורך במפתח או בבחירת מודל." : "הקריאות נעשות עם המפתח המוצפן שלך."}</span></div><button className="iconbtn" onClick={() => setByokOpen(false)} aria-label="סגור"><X size={14} /></button></div>
        {!canChooseProvider ? <div className="chat-ai-locked"><Lock size={16} /><span><strong>BYOK ובחירת ספק זמינים ב־Pro</strong><small>במצב הרגיל הכול מנוהל עבורך ואין צורך לדעת באיזה מודל נעשה שימוש.</small></span><a href="/account#plans">שדרוג ל־Pro</a></div> : <>
          <div className="chat-ai-mode"><button className={providerMode === "managed" ? "active" : ""} onClick={async () => { await fetch("/api/providers/byok", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "managed" }) }); setProviderMode("managed"); }}>מנוהל</button><button className={providerMode === "byok" ? "active" : ""} onClick={async () => { await fetch("/api/providers/byok", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "byok" }) }); setProviderMode("byok"); }}>המפתחות שלי</button></div>
          {providerMode === "byok" && <div className="chat-byok-list">{LLM_PROVIDERS.map((definition) => <label key={definition.id}><span><strong>{definition.labelHe}</strong><small>{byokProviders.includes(definition.id) ? "מפתח מוצפן שמור" : "לא הוגדר"}</small></span><input type="password" value={byokDraft[definition.id] || ""} onChange={(event) => setByokDraft((current) => ({ ...current, [definition.id]: event.target.value }))} placeholder="הדבק מפתח חדש" autoComplete="off" /><button className="btn sm" disabled={!byokDraft[definition.id]?.trim() || byokBusy === definition.id} onClick={() => void saveByok(definition.id)}>{byokBusy === definition.id ? "שומר…" : "שמור"}</button></label>)}</div>}
        </>}
      </section>}

      <div className="agent-modes" role="tablist" aria-label="מצב סוכן">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className={`mode-tab ${mode === m.id ? "on" : ""}`}
            data-tip={m.tip} data-tippos="down" onClick={() => changeMode(m.id)}>
            <m.icon size={13} strokeWidth={1.9} />{m.label}
          </button>
        ))}
      </div>

      <div className="agent-ctx" aria-label="הקשר נוכחי">
        <button type="button" className="ctx-chip on quote-chip" data-tip="ציטוט מקום — הכנס לתיבת ההודעה"
          data-tippos="down" onClick={() => insertQuote(playhead)} aria-label="ציטוט מקום לתיבת ההודעה">
          <MapPin size={11} strokeWidth={2} />{fmtTc(playhead)}
        </button>
        {selectionLabel
          ? <span className="ctx-chip on" title={selectionLabel}><SquareDashedMousePointer size={11} strokeWidth={2} />{selectionLabel.length > 18 ? selectionLabel.slice(0, 17) + "…" : selectionLabel}</span>
          : <span className="ctx-chip muted"><SquareDashedMousePointer size={11} strokeWidth={2} />אין בחירה</span>}
        {clips?.length ? <span className="ctx-chip"><Film size={11} strokeWidth={2} />{clips.length}</span> : null}
        {subs?.length ? <span className="ctx-chip"><Captions size={11} strokeWidth={2} />{subs.length}</span> : null}
      </div>

      <div className="chat-body2" ref={scrollRef}>
        {!restoredChat && <div className="chat-loading-stack" aria-label="טוען את השיחה"><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></div>}
        {restoredChat && items.length === 0 && (
          <div className="chat-empty2">
            העלה קבצים ותאר מה לעשות — למשל: “השאר רק את הקטע על X”, “תמלל והכן כתוביות”, “הסר שתיקות ונשימות”.
          </div>
        )}
        {displayItems.map((it, i) => {
          if (it.kind === "quote") {
            return (
              <div key={i} className="msg2 quote" role="note" aria-label="ציטוט מקום">
                <div className="b">
                  <div className="quote-head"><Quote size={13} strokeWidth={2} />ציטוט מקום</div>
                  <div className="quote-tc">{formatQuoteTime(it.seconds)}</div>
                  <div className="quote-sec">{it.seconds.toFixed(2)}s על הציר</div>
                  <button className="cp" onClick={() => copy(it.text, i)} aria-label="העתק">{copied === i ? <Check size={13} /> : <Copy size={13} />}</button>
                </div>
                <span className="t">{it.time}</span>
              </div>
            );
          }
          if (it.kind === "tool") {
            const Icon = toolIcon(it.name);
            const count = it.count || 1;
            const title = toolGroupTitle(it.label, count);
            const detail = toolGroupSummary(it.name, count, it.summary, it.status, it.state);
            const duration = it.durationMs != null ? ` · ${(it.durationMs / 1000).toFixed(it.durationMs < 10000 ? 1 : 0)}s` : "";
            const statusText = (it.state === "running" ? (count > 1 ? `${it.status} (×${count})` : it.status) : detail) + duration;
            return (
              <div key={it.id || i} className="tool2">
                <span className="ic" style={{ background: it.color + "22", color: it.color }}><Icon size={15} strokeWidth={1.75} /></span>
                <div className="tx">
                  <div className="nm" style={{ color: it.color }}>{title}</div>
                  <div className="st">{it.providerLabel ? `דרך ${it.providerLabel} · ${statusText}` : statusText}</div>
                </div>
                <span className="stt tool-actions">
                  {it.state === "running" && <Loader2 size={15} className="spin" style={{ color: "var(--accent)" }} />}
                  {it.state === "ok" && <Check size={15} className="stt ok" />}
                  {it.state === "error" && <AlertTriangle size={15} className="stt err" />}
                  {it.state === "error" && it.args && <button className="btn sm" onClick={() => retryTool(it)} disabled={running}>נסה שוב</button>}
                  {it.state === "ok" && it.checkpoint && <button className="btn sm" onClick={() => restoreToolCheckpoint(it)} disabled={running || it.restored}>{it.restored ? "שוחזר" : "שחזר"}</button>}
                </span>
              </div>
            );
          }
          if (it.kind === "plan") {
            return (
              <div key={it.id} className="msg2 assistant" role="region" aria-label="תוכנית עריכה לאישור">
                <div className="msg-speaker"><span className="msg-avatar agent" aria-hidden="true"><Robot size={13} weight="bold" /></span><strong>עוזר AI</strong></div>
                <div className="b">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><ClipboardList size={15} />תוכנית עריכה</div>
                  {it.steps.length > 0 ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {it.steps.map((step, index) => <div key={index} style={{ display: "flex", gap: 7 }}><span aria-hidden="true">☐</span><span>{step}</span></div>)}
                    </div>
                  ) : <ChatMarkdown text={it.text} />}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {it.state === "pending" && <>
                      <button className="btn primary sm" onClick={() => approvePlan(it)} disabled={running}>אשר ובצע</button>
                      <button className="btn sm" onClick={() => revisePlan(it)} disabled={running}>בקש שינוי</button>
                    </>}
                    {it.state === "approved" && <span className="ctx-chip on"><Check size={12} />אושרה ונשלחה לביצוע</span>}
                    {it.state === "revision" && <span className="ctx-chip muted">ממתינה לעדכון</span>}
                  </div>
                </div>
                <span className="t">{it.time}</span>
              </div>
            );
          }
          if (it.kind === "provider_approval") {
            return (
              <div key={it.id} className="msg2 assistant" role="note" aria-label="הודעת ספק ישנה">
                <div className="msg-speaker"><span className="msg-avatar agent" aria-hidden="true"><Robot size={13} weight="bold" /></span><strong>עוזר AI</strong></div>
                <div className="b">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><Info size={15} />הודעה משיחה קודמת</div>
                  <div>אין עוד צורך באישור ספק במצב המנוהל. שלח את ההוראה מחדש והיא תטופל אוטומטית.</div>
                </div>
                <span className="t">{it.time}</span>
              </div>
            );
          }
          if (it.kind === "output") {
            return <ChatMediaCard key={i} url={it.url} name={it.name} mkind={it.mkind} />;
          }
          return (
            <div key={i} className={`msg2 ${it.kind}`}>
              {(it.kind === "user" || it.kind === "assistant") && <div className="msg-speaker">
                <span className={`msg-avatar ${it.kind === "assistant" ? "agent" : "user"}`} aria-hidden="true">{it.kind === "assistant" ? <Robot size={13} weight="bold" /> : "א"}</span>
                <strong>{it.kind === "assistant" ? "עוזר AI" : "אני"}</strong>
              </div>}
              <div className="b">
                {it.kind === "error" && <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginInlineEnd: 6, color: "var(--danger)" }} />}
                {it.kind === "user" && it.references?.length ? <div className="message-reference-stack">
                  {it.references.map((reference, referenceIndex) => <div className={`message-reference-card ${reference.kind}`} key={`${reference.token}-${referenceIndex}`}>
                    <Quote size={12} /><span><b>{reference.label}</b>{reference.preview && <small>{reference.preview}</small>}</span>
                  </div>)}
                </div> : null}
                {it.kind === "assistant" ? <ChatMarkdown text={it.text} /> : it.kind === "user" ? <ChatUserText text={it.text} /> : it.text}
              </div>
              {(it.kind === "user" || it.kind === "assistant") ? <div className="msg-meta">
                <time>{it.time}</time>
                {it.kind === "assistant" && canChooseProvider && providerMode === "byok" && it.modelLabel && <span className="msg-model">{it.modelLabel}</span>}
                <span className="msg-actions">
                  <button type="button" onClick={() => quoteMessage(it)} aria-label="צטט הודעה" data-tip="צטט"><Quote size={12} /></button>
                  <button type="button" onClick={() => copy(it.text, i)} aria-label="העתק הודעה" data-tip="העתק">{copied === i ? <Check size={12} /> : <Copy size={12} />}</button>
                </span>
              </div> : <span className="t">{it.time}</span>}
            </div>
          );
        })}
        {showThinking && (
          <div className="msg2 assistant thinking-message" aria-live="polite" aria-label="Hypescript חושב">
            <div className="msg-speaker"><span className="msg-avatar agent" aria-hidden="true"><Robot size={13} weight="bold" /></span><strong>עוזר AI</strong></div>
            <div className="b think2">
              <span className="dots2" aria-hidden="true"><i /><i /><i /></span>
              <span className="sr-only">חושב</span>
            </div>
          </div>
        )}
        {latestExport && (
          <div className="pinned-export">
            <div className="pinned-label">הייצוא האחרון מוכן</div>
            <ChatMediaCard url={latestExport.url} name={latestExport.name} mkind="video" />
          </div>
        )}
        {ask && (
          <div className="ask2">
            <div className="q">{ask.q}</div>
            <div className="opts">{ask.options.map((o, i) => (<button key={i} className="btn sm" onClick={() => answerAsk(o)}>{o}</button>))}</div>
            <div className="free">
              <input value={askText} onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && askText.trim()) answerAsk(askText); }}
                placeholder="או כתוב תשובה משלך…" />
              <button className="btn primary sm" disabled={!askText.trim()} onClick={() => answerAsk(askText)}>שלח</button>
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

        <div
          className="compose-resize"
          onMouseDown={startResizeCompose}
          onDoubleClick={() => { setComposeH(COMPOSE_H_DEFAULT); localStorage.setItem(COMPOSE_H_KEY, String(COMPOSE_H_DEFAULT)); }}
          title="גרור לשינוי גובה תיבת ההודעה · דאבל-קליק לאיפוס"
          role="separator"
          aria-orientation="horizontal"
          aria-label="שינוי גובה תיבת ההודעה"
        />
        {uploading && <UploadProgressCard value={uploading} compact />}
        {!input.trim() && !running && (suggestionTurns.length >= 2 || suggestionsLoading) && <section className="chat-suggestions" aria-label="הצעות להמשך השיחה">
          <header><span><Sparkles size={13} />הצעות לפי השיחה</span><small>נוצרו מההקשר האחרון</small></header>
          <div className="chat-suggestion-list">
            {suggestionsLoading && suggestions.length === 0
              ? <><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></>
              : suggestions.map((suggestion, index) => <button type="button" key={`${suggestion}-${index}`} onClick={() => { setInput(suggestion); taRef.current?.focus(); }}><span>{index + 1}</span>{suggestion}</button>)}
          </div>
        </section>}

        {!input.trim() && !running && suggestionTurns.length < 2 && <div className="chat-starters" aria-label="פעולות התחלה מהירה">
          <span>התחלה מהירה</span>
          {["הסר שתיקות ונשימות מכל הווידאו.", "צור כתוביות מסונכרנות בעברית.", "השאר רק את החלקים לפי הסקריפט."].map((starter) => <button type="button" key={starter} onClick={() => { setInput(starter); taRef.current?.focus(); }}>{starter}</button>)}
        </div>}

        <div className="chat-compose">
          {composerReferences.length > 0 && <div className="composer-references" aria-label="קבצים וציטוטים מצורפים">
            {composerReferences.map((reference) => <span key={reference.token} className={`composer-reference ${reference.kind}`}>
              {reference.kind === "time" || reference.kind === "message" ? <Quote size={13} /> : reference.kind === "media" ? <Paperclip size={13} /> : <AtSign size={13} />}
              <span><b>{reference.label}</b>{reference.kind === "message" && reference.preview ? <small>{reference.preview}</small> : null}</span>
              <button type="button" aria-label={`הסר ${reference.label}`} onClick={() => setComposerReferences((current) => current.filter((item) => item.token !== reference.token))}><X size={12} /></button>
            </span>)}
          </div>}
          <div className="chat-compose-tools">
            <button className="iconbtn lg" data-tip="העלה קובץ" data-tippos="up" onClick={() => attachRef.current?.click()} aria-label="העלה קובץ"><Paperclip size={16} strokeWidth={1.75} /></button>
            <input ref={attachRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => { void handleAttachments(e.target.files); e.currentTarget.value = ""; }} />
            <button className="iconbtn lg" data-tip="פקודה (/)" data-tippos="up" onClick={() => { setInput("/"); setPop({ kind: "slash", query: "" }); taRef.current?.focus(); }} aria-label="פקודות"><Command size={16} strokeWidth={1.75} /></button>
            <button className="iconbtn lg" data-tip="אזכור (@)" data-tippos="up" onClick={() => { setInput((v) => v + (v && !v.endsWith(" ") ? " @" : "@")); setPop({ kind: "mention", query: "" }); taRef.current?.focus(); }} aria-label="אזכורים"><AtSign size={16} strokeWidth={1.75} /></button>
          </div>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onComposerKey}
            onBlur={() => setTimeout(() => setPop(null), 120)}
            placeholder={running ? "עדכן את הסוכן תוך כדי עבודה…" : mode === "ask" ? "שאל על הפרויקט…  /  @  לאזכור" : mode === "plan" ? "תאר מה לתכנן…  /  @  לאזכור" : "כתוב הוראה…  /  לפקודה,  @  לאזכור"}
            style={{ height: composeH }}
            rows={3}
          />
          <div className="chat-compose-send">
            {running
              ? <><button className="btn primary" onClick={submit} disabled={!input.trim() && composerReferences.length === 0} data-tip="עדכן" data-tippos="up"><Send size={15} strokeWidth={2} /></button>
                 <button className="iconbtn lg danger" onClick={() => runnerRef.current?.stop()} data-tip="בטל" data-tippos="up" aria-label="בטל"><Square size={15} strokeWidth={2} /></button></>
              : <button className="btn primary" onClick={submit} disabled={!input.trim() && composerReferences.length === 0} data-tip="שלח" data-tippos="up"><Send size={15} strokeWidth={2} /></button>}
          </div>
        </div>
      </div>
    </>
  );
}

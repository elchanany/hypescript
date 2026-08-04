"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { MdPart, parseChatMarkdown } from "@/lib/chat/markdown";

function Inline({ parts }: { parts: MdPart[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.text}</span>;
        if (p.type === "bold") return <strong key={i} className="md-bold">{p.text}</strong>;
        if (p.type === "code") return <code key={i} className="md-code">{p.text}</code>;
        if (p.type === "br") return <br key={i} />;
        if (p.type === "ask") return <div key={i} className="md-ask">{p.text}</div>;
        if (p.type === "ul") {
          return (
            <ul key={i} className="md-ul">
              {p.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        if (p.type === "ol") {
          return (
            <ol key={i} className="md-ol">
              {p.items.map((it, j) => <li key={j}>{it}</li>)}
            </ol>
          );
        }
        if (p.type === "codeblock") {
          return <CopyBlock key={i} text={p.text} lang={p.lang} />;
        }
        return null;
      })}
    </>
  );
}

function CopyBlock({ text, lang }: { text: string; lang?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="md-pre">
      <div className="md-pre-bar">
        <span>{lang || "טקסט"}</span>
        <button
          type="button"
          className="md-copy"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setOk(true);
              setTimeout(() => setOk(false), 1200);
            }).catch(() => {});
          }}
          aria-label="העתק"
        >
          {ok ? <Check size={13} /> : <Copy size={13} />}
          {ok ? "הועתק" : "העתק"}
        </button>
      </div>
      <pre dir="auto">{text}</pre>
    </div>
  );
}

/** רינדור markdown קל להודעת סוכן. */
export default function ChatMarkdown({ text }: { text: string }): ReactNode {
  const parts = parseChatMarkdown(text);
  return <div className="md-body"><Inline parts={parts} /></div>;
}

"use client";

import { useEffect, useState } from "react";
import { GROQ_KEY, OPENAI_KEY } from "@/lib/keys";

export default function SettingsPage() {
  const [groq, setGroq] = useState("");
  const [openai, setOpenai] = useState("");
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setGroq(localStorage.getItem(GROQ_KEY) || "");
    setOpenai(localStorage.getItem(OPENAI_KEY) || "");
  }, []);

  const save = () => {
    localStorage.setItem(GROQ_KEY, groq.trim());
    localStorage.setItem(OPENAI_KEY, openai.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="hero">
        <h1>הגדרות</h1>
        <p>המפתחות נשמרים רק בדפדפן שלך (localStorage) — לא נשלחים לשום מקום מלבד שירות התמלול.</p>
      </div>

      <div className="card">
        <h2>מפתחות API</h2>

        <label className="field">
          <span>מפתח Groq (לתמלול) — קבל חינם ב-console.groq.com/keys</span>
          <input
            type={show ? "text" : "password"}
            value={groq}
            onChange={(e) => setGroq(e.target.value)}
            placeholder="gsk_..."
          />
        </label>

        <label className="field">
          <span>מפתח OpenAI / AI (לסוכן ה-AI העתידי — עדיין לא בשימוש)</span>
          <input
            type={show ? "text" : "password"}
            value={openai}
            onChange={(e) => setOpenai(e.target.value)}
            placeholder="sk-..."
          />
        </label>

        <label className="check" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          הצג מפתחות
        </label>

        <div className="row">
          <button className="btn primary" onClick={save}>שמור</button>
          {saved && <span className="ok">נשמר ✓</span>}
        </div>
      </div>

      <div className="card">
        <h2>בקרוב</h2>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          סוכן AI שיֵדע לחתוך, לערוך ולהחליט לבד מה להשאיר — ישתמש במפתח ה-OpenAI/AI שלמעלה.
        </p>
      </div>
    </div>
  );
}

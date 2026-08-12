"use client";

import { useEffect } from "react";
import { X, Command, Scissors, Trash2, Play, ZoomIn, ZoomOut, Undo2, Redo2, Layers, Sparkles, MessageCircle } from "lucide-react";
import { toast } from "@/lib/ui/toast";

interface ShortcutGroup {
  category: string;
  items: { key: string; label: string; icon?: any }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: "נגן וניווט",
    items: [
      { key: "Space", label: "נגן / השהה", icon: Play },
      { key: "J / K / L", label: "אחורה / עצור / קדימה" },
      { key: "← / →", label: "קפוץ פריים אחד" },
      { key: "Shift + ← / →", label: "קפוץ 1 שנייה" },
      { key: "Home / End", label: "תחילת / סוף הפרויקט" },
    ],
  },
  {
    category: "עריכה וגזירה",
    items: [
      { key: "S", label: "פיצול קטע בראש-הנגן", icon: Scissors },
      { key: "Delete / Backspace", label: "מחיקת קטע נבחר", icon: Trash2 },
      { key: "Shift + Delete", label: "מחיקה והשארת רווח" },
      { key: "Ctrl + Z", label: "ביטול פעולה (Undo)", icon: Undo2 },
      { key: "Ctrl + Shift + Z", label: "ביצוע מחדש (Redo)", icon: Redo2 },
    ],
  },
  {
    category: "ציר זמן וזום",
    items: [
      { key: "Ctrl + גלגלת", label: "זום ציר זמן (Zoom In/Out)", icon: ZoomIn },
      { key: "Shift + גלגלת", label: "גלילה אופקית בציר הזמן" },
      { key: "[ / ]", label: "החלקת מקור קטע (Slip)" },
      { key: "Alt + ← / →", label: "הזזת נקודת חיתוך (Roll)" },
    ],
  },
  {
    category: "סוכן AI וצ׳אט",
    items: [
      { key: "Ctrl + Shift + C", label: "פתיחה / סגירת צ׳אט AI", icon: MessageCircle },
      { key: "Ctrl + K", label: "פתיחת מפת מקשים מהירה", icon: Command },
      { key: "Escape", label: "סגירת חלונות ומודאלים" },
    ],
  },
];

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleKeyClick = (key: string, label: string) => {
    toast.info(`מקש: ${key}`, label);
  };

  return (
    <div className="kbd-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kbd-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="kbd-header">
          <div className="kbd-title">
            <div className="kbd-icon-badge">
              <Command size={18} />
            </div>
            <div>
              <h3>קיצורי מקשים מהירים</h3>
              <p>שלוט בעורך הווידאו במהירות מקצועית</p>
            </div>
          </div>
          <button type="button" className="iconbtn close-btn" onClick={onClose} aria-label="סגור">
            <X size={18} />
          </button>
        </div>

        <div className="kbd-body">
          {SHORTCUTS.map((group, idx) => (
            <div key={idx} className="kbd-group">
              <h4>{group.category}</h4>
              <div className="kbd-list">
                {group.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="kbd-item"
                      onClick={() => handleKeyClick(item.key, item.label)}
                      title="לחץ לבדיקה"
                    >
                      <div className="kbd-label">
                        {Icon && <Icon size={14} className="kbd-item-icon" />}
                        <span>{item.label}</span>
                      </div>
                      <kbd className="kbd-badge">{item.key}</kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="kbd-footer">
          <div className="kbd-tip">
            <Sparkles size={14} className="sparkle-icon" />
            <span>טיפ: לחץ על <b>Ctrl + K</b> בכל עת לפתיחת חלון זה</span>
          </div>
          <button type="button" className="btn primary" onClick={onClose}>
            הבנתי, תודה!
          </button>
        </div>
      </div>
    </div>
  );
}

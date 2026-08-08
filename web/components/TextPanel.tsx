"use client";

import { Sparkles, Type } from "lucide-react";
import { Button, Section } from "@/components/ui";

export default function TextPanel({ onAddText, onAddSourcePopup }: { onAddText: () => void; onAddSourcePopup: () => void }) {
  return (
    <>
      <div className="panel-header">
        <span className="title"><Type size={15} strokeWidth={1.75} />טקסט</span>
      </div>
      <div className="panel-scroll">
        <Section title="הוספה ללוח">
          <div className="cap-body" style={{ padding: 0 }}>
            <p className="cap-hint" style={{ marginBottom: 10 }}>
              הוסף שכבת טקסט מעל הווידאו. אפשר לגרור, לשנות גודל ולסובב בתצוגה המקדימה, ולערוך מאפיינים בפאנל הימני.
            </p>
            <Button variant="secondary" icon={Type} onClick={onAddText}>הוסף טקסט</Button>
            <Button variant="secondary" icon={Sparkles} onClick={onAddSourcePopup} tip="פופ-אפ מעוצב לפתיח, למשל: מתוך שיעור של…">פופ-אפ מקור מעוצב</Button>
          </div>
        </Section>
      </div>
    </>
  );
}

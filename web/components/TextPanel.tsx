"use client";

import { Sparkles, Type } from "lucide-react";
import { Button, Section } from "@/components/ui";

export default function TextPanel({ onAddText, onAddPopup }: { onAddText: () => void; onAddPopup: (preset: "source_popup" | "speaker_card" | "dedication_card") => void }) {
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
            <Button variant="secondary" icon={Sparkles} onClick={() => onAddPopup("source_popup")} tip="פתיח מעוצב, למשל: מתוך שיעור של…">פופ-אפ מקור</Button>
            <Button variant="secondary" icon={Sparkles} onClick={() => onAddPopup("speaker_card")} tip="כרטיס דובר בסגנון lower-third">כרטיס שם הדובר</Button>
            <Button variant="secondary" icon={Sparkles} onClick={() => onAddPopup("dedication_card")} tip="כרטיס הקדשה מעוצב ורב-שורות">כרטיס הקדשה</Button>
          </div>
        </Section>
      </div>
    </>
  );
}

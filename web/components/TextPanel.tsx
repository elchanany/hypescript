"use client";

import { Type } from "lucide-react";
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
            <div className="text-template-grid" aria-label="תבניות טקסט">
              <button className="text-template-card title" onClick={() => onAddPopup("source_popup")}><span>כותרת פתיחה</span><i>כותרת מרכזית</i></button>
              <button className="text-template-card lower" onClick={() => onAddPopup("speaker_card")}><span>כותרת תחתונה</span><i>שם · תיאור קצר</i></button>
              <button className="text-template-card info" onClick={() => onAddPopup("dedication_card")}><span>כרטיס מידע</span><i>כותרת ופרטים</i></button>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

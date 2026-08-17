"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, WandSparkles } from "@/components/icons";
import { CURATED_VECTOR_ELEMENTS, ICON_CATEGORIES, IconCategory, searchVectorElements, VectorElement } from "@/lib/creative/iconify";
import { searchShapes, SHAPE_CATEGORIES, ShapeCategory, VECTOR_SHAPES, VectorShape } from "@/lib/creative/shapes";
import { CURATED_MOTION_ASSETS, MOTION_CATEGORIES, MotionAsset } from "@/lib/creative/motionAssets";

interface Props {
  onAddVectorElement: (element: VectorElement) => void;
  onAddShape: (shape: VectorShape) => void;
  onAddMotionAsset: (motion: MotionAsset) => void;
}

type SubTab = "icons" | "shapes" | "motion";

export default function ElementsBrowser({ onAddVectorElement, onAddShape, onAddMotionAsset }: Props) {
  const [tab, setTab] = useState<SubTab>("icons");
  const [query, setQuery] = useState("");
  const [iconCat, setIconCat] = useState<string>("all");
  const [shapeCat, setShapeCat] = useState<string>("all");

  const icons = useMemo(() => searchVectorElements(query, iconCat as any), [query, iconCat]);
  const shapes = useMemo(() => searchShapes(query, shapeCat as any), [query, shapeCat]);
  const motionAssets = useMemo(() => {
    const q = query.toLowerCase();
    return CURATED_MOTION_ASSETS.filter((m) => !q || m.nameHe.toLowerCase().includes(q) || m.descriptionHe.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <div className="creative-mode-toggle triple">
          <button
            className={`mode-btn ${tab === "icons" ? "active" : ""}`}
            onClick={() => { setTab("icons"); setQuery(""); }}
          >
            <span>אייקונים ({icons.length})</span>
          </button>
          <button
            className={`mode-btn ${tab === "shapes" ? "active" : ""}`}
            onClick={() => { setTab("shapes"); setQuery(""); }}
          >
            <span>צורות ({shapes.length})</span>
          </button>
          <button
            className={`mode-btn ${tab === "motion" ? "active" : ""}`}
            onClick={() => { setTab("motion"); setQuery(""); }}
          >
            <span>Motion ({motionAssets.length})</span>
          </button>
        </div>

        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "icons" ? "חיפוש אייקונים (חצים, יוטיוב, טיקטוק, לב, וי...)"
              : tab === "shapes" ? "חיפוש צורות (מלבן, עיגול, כוכב, בלון דיבור, סרט...)"
              : "חיפוש אלמנטים מונפשים (סאבסקרייב, קונפטי, להבה, פעמון...)"
            }
          />
        </label>

        {tab === "icons" && (
          <div className="creative-category-pills">
            <button
              className={`pill ${iconCat === "all" ? "active" : ""}`}
              onClick={() => setIconCat("all")}
            >
              הכל
            </button>
            {ICON_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`pill ${iconCat === c.id ? "active" : ""}`}
                onClick={() => setIconCat(c.id)}
              >
                {c.labelHe}
              </button>
            ))}
          </div>
        )}

        {tab === "shapes" && (
          <div className="creative-category-pills">
            <button
              className={`pill ${shapeCat === "all" ? "active" : ""}`}
              onClick={() => setShapeCat("all")}
            >
              הכל
            </button>
            {SHAPE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`pill ${shapeCat === c.id ? "active" : ""}`}
                onClick={() => setShapeCat(c.id)}
              >
                {c.labelHe}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="creative-scroll-content">
        {tab === "icons" && (
          <div className="elements-grid">
            {icons.map((item) => (
              <button
                key={item.id}
                className="element-item-card"
                onClick={() => onAddVectorElement(item)}
                title={`${item.nameHe} (${item.iconSet} · ${item.license}) — לחץ להוספה מעל הווידאו`}
              >
                <div className="element-svg-wrap" style={{ color: item.defaultColor }}>
                  <svg
                    viewBox={item.viewBox}
                    width="32"
                    height="32"
                    dangerouslySetInnerHTML={{ __html: item.svgPath }}
                  />
                </div>
                <strong>{item.nameHe}</strong>
                <span className="license-tag">{item.license}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "shapes" && (
          <div className="elements-grid">
            {shapes.map((shape) => (
              <button
                key={shape.id}
                className="element-item-card"
                onClick={() => onAddShape(shape)}
                title={`${shape.nameHe} — לחץ להוספה מעל הווידאו`}
              >
                <div className="element-svg-wrap" style={{ color: shape.defaultFill }}>
                  <svg
                    viewBox={shape.viewBox}
                    width="36"
                    height="36"
                    dangerouslySetInnerHTML={{ __html: shape.svgContent }}
                  />
                </div>
                <strong>{shape.nameHe}</strong>
              </button>
            ))}
          </div>
        )}

        {tab === "motion" && (
          <div className="motion-elements-grid">
            {motionAssets.map((motion) => (
              <button
                key={motion.id}
                className="motion-asset-card"
                onClick={() => onAddMotionAsset(motion)}
                title={`${motion.nameHe} — ${motion.descriptionHe}`}
              >
                <div className="motion-svg-stage">
                  <svg
                    viewBox={motion.viewBox}
                    width="100%"
                    height="100%"
                    dangerouslySetInnerHTML={{ __html: motion.animatedSvgMarkup }}
                  />
                </div>
                <div className="motion-meta">
                  <strong>{motion.nameHe}</strong>
                  <small>{motion.descriptionHe}</small>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

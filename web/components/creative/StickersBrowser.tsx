"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "@/components/icons";
import { GIPHY_CATEGORIES, GiphyAssetItem, STARTER_STICKERS } from "@/lib/creative/giphy";

interface Props {
  onAddStickerOverlay: (sticker: GiphyAssetItem) => void;
}

export default function StickersBrowser({ onAddStickerOverlay }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"stickers" | "gifs">("stickers");
  const [items, setItems] = useState<GiphyAssetItem[]>(() => [...STARTER_STICKERS]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchGiphy = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("type", type);
        params.set("limit", "30");

        const res = await fetch(`/api/creative/giphy?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
            setLoading(false);
            return;
          }
        }
      } catch {
        /* Fallback */
      }
      if (!cancelled) {
        const q = query.toLowerCase();
        setItems(STARTER_STICKERS.filter((s) => !q || s.title.toLowerCase().includes(q)));
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchGiphy, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, type]);

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <div className="creative-mode-toggle">
          <button
            className={`mode-btn ${type === "stickers" ? "active" : ""}`}
            onClick={() => setType("stickers")}
          >
            <span>סטיקרים שקופים ✨</span>
          </button>
          <button
            className={`mode-btn ${type === "gifs" ? "active" : ""}`}
            onClick={() => setType("gifs")}
          >
            <span>GIFs מונפשים 🎬</span>
          </button>
        </div>

        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש ב-GIPHY (קונפטי, אש, לייק, חץ, וואו...)"
          />
        </label>

        <div className="creative-category-pills">
          {GIPHY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`pill ${query === cat.labelHe ? "active" : ""}`}
              onClick={() => setQuery(cat.id === "trending" ? "" : cat.id)}
            >
              {cat.labelHe}
            </button>
          ))}
        </div>
      </div>

      <div className="creative-scroll-content">
        <div className="stickers-grid">
          {items.map((item) => (
            <button
              key={item.id}
              className="sticker-card"
              onClick={() => onAddStickerOverlay(item)}
              title={`${item.title} — לחץ להוספה מעל הווידאו`}
            >
              <img src={item.previewUrl} alt={item.title} loading="lazy" />
              <span className="sticker-name">{item.title}</span>
            </button>
          ))}
        </div>

        {/* GIPHY Attribution */}
        <div className="giphy-attribution-badge">
          <span>Powered by GIPHY</span>
        </div>
      </div>
    </div>
  );
}

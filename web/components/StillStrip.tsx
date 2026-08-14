"use client";

import { memo, useEffect, useRef, useState } from "react";

const CELL_W = 72;

/** Repeats a still at its natural aspect instead of stretching one bitmap across a deep zoom. */
function StillStrip({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setCount(Math.max(1, Math.min(80, Math.ceil(el.clientWidth / CELL_W))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div className="filmstrip stillstrip" ref={ref} aria-hidden>
    {Array.from({ length: count }, (_, i) => <div className="fs-cell" key={i}><img src={src} alt="" draggable={false} /></div>)}
  </div>;
}

export default memo(StillStrip);

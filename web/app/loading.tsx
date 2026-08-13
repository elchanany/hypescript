import BrandLogo from "@/components/BrandLogo";

export default function AppLoading() {
  return <main className="route-loading" role="status" aria-live="polite" aria-label="Hypescript טוען את המסך">
    <div className="route-loading-brand"><BrandLogo variant="icon" size="sm" decorative priority /><span>מכינים את סביבת העבודה</span></div>
    <div className="route-loading-shell">
      <aside className="skeleton-shimmer" />
      <section><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></section>
      <aside className="skeleton-shimmer" />
    </div>
  </main>;
}

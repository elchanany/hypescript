import HypescriptBrandSpinner from "@/components/HypescriptBrandSpinner";

export default function AppLoading() {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-label="Hypescript טוען את המסך">
      <div className="route-loading-brand">
        <HypescriptBrandSpinner size="lg" label="טוענים את המסך…" priority />
      </div>
    </main>
  );
}

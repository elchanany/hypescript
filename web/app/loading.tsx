import BrandLogo from "@/components/BrandLogo";
import { Loader2 } from "@/components/icons";

export default function AppLoading() {
  return <main className="route-loading" role="status" aria-live="polite" aria-label="Hypescript טוען את המסך">
    <div className="route-loading-brand"><BrandLogo variant="icon" size="md" decorative priority /><Loader2 className="spin" size={18} /><span>טוענים את המסך…</span></div>
  </main>;
}

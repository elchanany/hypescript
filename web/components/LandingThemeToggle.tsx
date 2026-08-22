"use client";

import { Moon, Sun } from "@/components/icons";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function LandingThemeToggle() {
  const { resolved, setMode } = useTheme();
  const dark = resolved === "dark";

  return (
    <button
      type="button"
      className="landing-theme-toggle"
      onClick={() => setMode(dark ? "light" : "dark")}
      aria-label={dark ? "עבור למצב בהיר" : "עבור למצב כהה"}
      title={dark ? "מצב בהיר" : "מצב כהה"}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

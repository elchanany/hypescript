"""ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות).

ה-GUI הוא front-end דק: הוא בונה את פקודת ה-CLI מהטופס, מריץ אותה כתת-תהליך,
ומזרים את הפלט בזמן אמת לחלון הלוג. כך הוא משתמש בדיוק באותו pipeline שנבדק.

הפעלה:  python -m hypescript.gui   (או לחיצה כפולה על run_gui.pyw)
"""

from __future__ import annotations

import os
import queue
import subprocess
import sys
import threading
from typing import List, Optional

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# --- ערכת צבעים קלילה ---
BG = "#f4f6fa"
CARD = "#ffffff"
ACCENT = "#2d6cdf"
ACCENT_DK = "#1f52b0"
TEXT = "#1b1f27"
MUTED = "#6b7280"
LOG_BG = "#0f1420"
LOG_FG = "#d6e2ff"


# --------------------------------------------------------------------------- #
# בניית פקודה (טהור — נוח לבדיקה)
# --------------------------------------------------------------------------- #
def build_command(v: dict) -> List[str]:
    """בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס."""
    cmd = [sys.executable, "-m", "hypescript"] + list(v["inputs"])
    if v.get("script"):
        cmd += ["--script", v["script"]]
    cmd += ["--engine", v["engine"]]
    if v["engine"] == "cloud":
        cmd += ["--cloud-provider", v["provider"]]
        if v.get("model"):
            cmd += ["--model", v["model"]]
    else:
        if v.get("model"):
            cmd += ["--model", v["model"]]
    cmd += [
        "--silence-threshold", str(v["threshold"]),
        "--padding", str(v["padding"]),
        "--max-chars", str(v["max_chars"]),
    ]
    if v.get("remove_fillers"):
        cmd += ["--remove-fillers"]
    if v.get("burn_subs"):
        cmd += ["--burn-subs"]
    if v.get("font"):
        cmd += ["--font", v["font"]]
    if v.get("intro"):
        cmd += ["--intro", v["intro"]]
    if v.get("outro"):
        cmd += ["--outro", v["outro"]]
    if v.get("output"):
        cmd += ["-o", v["output"]]
    if v.get("dry_run"):
        cmd += ["--dry-run"]
    return cmd


# --------------------------------------------------------------------------- #
# האפליקציה
# --------------------------------------------------------------------------- #
class HypescriptGUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.proc: Optional[subprocess.Popen] = None
        self.q: "queue.Queue[str]" = queue.Queue()
        self.inputs: List[str] = []
        self.last_output: Optional[str] = None

        root.title("hypescript — עריכת שיעורים בעברית")
        root.configure(bg=BG)
        root.geometry("720x780")
        root.minsize(640, 640)

        self._init_style()
        self._build_header()
        self._build_body()
        self._build_footer()

        # טען מפתח מהסביבה אם קיים
        for name in ("ELEVENLABS_API_KEY", "GROQ_API_KEY", "HYPESCRIPT_API_KEY"):
            if os.environ.get(name):
                self.api_key.set(os.environ[name])
                if name == "ELEVENLABS_API_KEY":
                    self.provider.set("elevenlabs")
                break

        self._toggle_engine()
        self.root.after(100, self._drain_queue)

    # ----- עיצוב -----
    def _init_style(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", background=BG, foreground=TEXT, font=("Segoe UI", 10))
        style.configure("Card.TFrame", background=CARD, relief="flat")
        style.configure("TLabel", background=CARD, foreground=TEXT)
        style.configure("Muted.TLabel", background=CARD, foreground=MUTED, font=("Segoe UI", 9))
        style.configure("Head.TLabel", background=BG, foreground=TEXT)
        style.configure("Section.TLabel", background=CARD, foreground=ACCENT,
                        font=("Segoe UI Semibold", 11))
        style.configure("TCheckbutton", background=CARD, foreground=TEXT)
        style.configure("TRadiobutton", background=CARD, foreground=TEXT)
        style.configure("TEntry", fieldbackground="#fbfcfe")
        style.configure("Accent.TButton", background=ACCENT, foreground="#ffffff",
                        font=("Segoe UI Semibold", 11), padding=(18, 10), borderwidth=0)
        style.map("Accent.TButton",
                  background=[("active", ACCENT_DK), ("disabled", "#a9b6cf")])
        style.configure("Ghost.TButton", padding=(12, 8))

    def _card(self, parent) -> ttk.Frame:
        outer = tk.Frame(parent, bg=BG)
        outer.pack(fill="x", padx=18, pady=(0, 12))
        card = ttk.Frame(outer, style="Card.TFrame", padding=16)
        card.pack(fill="x")
        # קו הפרדה עדין
        card.configure(borderwidth=1, relief="solid")
        return card

    def _build_header(self) -> None:
        head = tk.Frame(self.root, bg=BG)
        head.pack(fill="x", padx=18, pady=(16, 10))
        tk.Label(head, text="🎬  hypescript", bg=BG, fg=TEXT,
                 font=("Segoe UI Semibold", 20)).pack(anchor="e")
        tk.Label(head, text="חיתוך לפי סקריפט · הסרת נשימות · כתוביות עברית",
                 bg=BG, fg=MUTED, font=("Segoe UI", 10)).pack(anchor="e")

    def _build_body(self) -> None:
        # אזור גלילה למקרה של מסך קטן
        container = tk.Frame(self.root, bg=BG)
        container.pack(fill="both", expand=True)

        # ---- כרטיס: קבצים ----
        c = self._card(container)
        ttk.Label(c, text="קבצים", style="Section.TLabel").pack(anchor="e", pady=(0, 8))

        self.inputs_var = tk.StringVar(value="לא נבחרו קבצים")
        self._file_row(c, "וידאו (אחד או יותר)", self.inputs_var, self._pick_inputs)

        self.script = tk.StringVar()
        self._file_row(c, "סקריפט — הטקסט שיישאר (אופציונלי)", self.script,
                       self._pick_script, clearable=True)

        self.output = tk.StringVar()
        self._file_row(c, "קובץ פלט (ריק = אוטומטי)", self.output,
                       self._pick_output, clearable=True)

        # ---- כרטיס: מנוע ----
        c = self._card(container)
        ttk.Label(c, text="מנוע תמלול", style="Section.TLabel").pack(anchor="e", pady=(0, 8))

        self.engine = tk.StringVar(value="cloud")
        row = tk.Frame(c, bg=CARD)
        row.pack(fill="x", anchor="e")
        ttk.Radiobutton(row, text="ענן (Groq / ElevenLabs)", value="cloud",
                        variable=self.engine, command=self._toggle_engine).pack(side="right", padx=(12, 0))
        ttk.Radiobutton(row, text="מקומי (פרטי, על המחשב)", value="local",
                        variable=self.engine, command=self._toggle_engine).pack(side="right")

        self.cloud_frame = tk.Frame(c, bg=CARD)
        self.cloud_frame.pack(fill="x", pady=(10, 0))
        prow = tk.Frame(self.cloud_frame, bg=CARD)
        prow.pack(fill="x", anchor="e", pady=4)
        self.provider = tk.StringVar(value="groq")
        ttk.Combobox(
            prow,
            textvariable=self.provider,
            width=18,
            state="readonly",
            values=["groq", "elevenlabs", "openai"],
        ).pack(side="right", padx=(8, 0))
        ttk.Label(prow, text="ספק ענן", width=18, anchor="e").pack(side="right")
        self.api_key = tk.StringVar()
        krow = tk.Frame(self.cloud_frame, bg=CARD)
        krow.pack(fill="x", anchor="e", pady=4)
        self.key_entry = ttk.Entry(krow, textvariable=self.api_key, show="•")
        self.key_entry.pack(side="right", fill="x", expand=True, padx=(8, 0))
        self.key_label = ttk.Label(krow, text="מפתח API", width=18, anchor="e")
        self.key_label.pack(side="right")
        self.show_key = tk.BooleanVar(value=False)
        ttk.Checkbutton(self.cloud_frame, text="הצג מפתח", variable=self.show_key,
                        command=self._toggle_key).pack(anchor="e")
        ttk.Label(
            self.cloud_frame,
            text="ElevenLabs: ELEVENLABS_API_KEY · מודל scribe_v2 · Groq: GROQ_API_KEY",
            foreground=MUTED,
        ).pack(anchor="e", pady=(4, 0))

        self.local_frame = tk.Frame(c, bg=CARD)
        mrow = tk.Frame(self.local_frame, bg=CARD)
        mrow.pack(fill="x", anchor="e", pady=4)
        self.model = tk.StringVar(value="medium")
        ttk.Combobox(mrow, textvariable=self.model, width=18, state="readonly",
                     values=["tiny", "base", "small", "medium", "large-v3"]).pack(side="right", padx=(8, 0))
        ttk.Label(mrow, text="מודל", width=18, anchor="e").pack(side="right")

        # ---- כרטיס: עריכה ----
        c = self._card(container)
        ttk.Label(c, text="עריכה", style="Section.TLabel").pack(anchor="e", pady=(0, 8))

        self.remove_fillers = tk.BooleanVar(value=True)
        ttk.Checkbutton(c, text="הסר מילות-מהסס וגמגומים (אה, אמ, המ...)",
                        variable=self.remove_fillers).pack(anchor="e")
        self.burn_subs = tk.BooleanVar(value=False)
        ttk.Checkbutton(c, text="צרוב כתוביות בתוך הווידאו", variable=self.burn_subs).pack(anchor="e")

        self.threshold = tk.DoubleVar(value=0.4)
        self._spin_row(c, "סף שתיקה (שנ')", self.threshold, 0.1, 2.0, 0.05)
        self.padding = tk.DoubleVar(value=0.1)
        self._spin_row(c, "ריפוד (שנ')", self.padding, 0.0, 1.0, 0.05)
        self.max_chars = tk.IntVar(value=42)
        self._spin_row(c, "מקס' תווים בכתובית", self.max_chars, 20, 80, 1)

    def _build_footer(self) -> None:
        foot = tk.Frame(self.root, bg=BG)
        foot.pack(fill="both", expand=False, padx=18, pady=(0, 14))

        btns = tk.Frame(foot, bg=BG)
        btns.pack(fill="x", pady=(0, 8))
        self.run_btn = ttk.Button(btns, text="▶  הפעל", style="Accent.TButton", command=self._run_full)
        self.run_btn.pack(side="right")
        self.dry_btn = ttk.Button(btns, text="בדיקה מהירה (ללא רינדור)", style="Ghost.TButton",
                                  command=self._run_dry)
        self.dry_btn.pack(side="right", padx=8)
        self.stop_btn = ttk.Button(btns, text="עצור", style="Ghost.TButton",
                                   command=self._stop, state="disabled")
        self.stop_btn.pack(side="right")
        self.open_btn = ttk.Button(btns, text="פתח תיקיית פלט", style="Ghost.TButton",
                                   command=self._open_output, state="disabled")
        self.open_btn.pack(side="left")

        self.progress = ttk.Progressbar(foot, mode="indeterminate")
        self.progress.pack(fill="x", pady=(0, 8))

        self.log = tk.Text(foot, height=12, bg=LOG_BG, fg=LOG_FG, insertbackground=LOG_FG,
                           font=("Consolas", 9), relief="flat", padx=10, pady=8, wrap="word")
        self.log.pack(fill="both", expand=True)
        self._log("מוכן. בחר קובץ וידאו, ולחץ 'בדיקה מהירה' כדי לראות מה ייחתך.\n")

    # ----- רכיבי עזר לטופס -----
    def _file_row(self, parent, label, var, cmd, clearable=False) -> None:
        row = tk.Frame(parent, bg=CARD)
        row.pack(fill="x", anchor="e", pady=4)
        ttk.Button(row, text="בחר…", style="Ghost.TButton", command=cmd).pack(side="left")
        if clearable:
            ttk.Button(row, text="✕", width=3, style="Ghost.TButton",
                       command=lambda: var.set("")).pack(side="left", padx=(6, 0))
        ent = ttk.Entry(row, textvariable=var, state="readonly")
        ent.pack(side="right", fill="x", expand=True, padx=(8, 8))
        ttk.Label(row, text=label, width=26, anchor="e").pack(side="right")

    def _spin_row(self, parent, label, var, lo, hi, step) -> None:
        row = tk.Frame(parent, bg=CARD)
        row.pack(fill="x", anchor="e", pady=3)
        ttk.Spinbox(row, from_=lo, to=hi, increment=step, textvariable=var,
                    width=8).pack(side="right", padx=(8, 0))
        ttk.Label(row, text=label, width=22, anchor="e").pack(side="right")

    # ----- בוררי קבצים -----
    def _pick_inputs(self) -> None:
        paths = filedialog.askopenfilenames(
            title="בחר קובץ וידאו אחד או יותר",
            filetypes=[("וידאו", "*.mp4 *.mov *.mkv *.avi *.m4v *.webm"), ("הכל", "*.*")],
        )
        if paths:
            self.inputs = list(paths)
            self.inputs_var.set(f"{len(paths)} קבצים" if len(paths) > 1 else os.path.basename(paths[0]))

    def _pick_script(self) -> None:
        p = filedialog.askopenfilename(title="בחר קובץ טקסט", filetypes=[("טקסט", "*.txt"), ("הכל", "*.*")])
        if p:
            self.script.set(p)

    def _pick_output(self) -> None:
        p = filedialog.asksaveasfilename(title="שמור בשם", defaultextension=".mp4",
                                         filetypes=[("MP4", "*.mp4")])
        if p:
            self.output.set(p)

    # ----- תצוגה -----
    def _toggle_engine(self) -> None:
        if self.engine.get() == "cloud":
            self.local_frame.pack_forget()
            self.cloud_frame.pack(fill="x", pady=(10, 0))
        else:
            self.cloud_frame.pack_forget()
            self.local_frame.pack(fill="x", pady=(10, 0))

    def _toggle_key(self) -> None:
        self.key_entry.configure(show="" if self.show_key.get() else "•")

    def _log(self, text: str) -> None:
        self.log.insert("end", text)
        self.log.see("end")

    # ----- הרצה -----
    def _collect(self) -> Optional[dict]:
        if not self.inputs:
            messagebox.showwarning("חסר קלט", "בחר לפחות קובץ וידאו אחד.")
            return None
        if self.engine.get() == "cloud" and not self.api_key.get().strip():
            messagebox.showwarning(
                "חסר מפתח",
                "מצב ענן דורש מפתח API (Groq / ElevenLabs / OpenAI). הזן מפתח או עבור למצב מקומי.",
            )
            return None
        return {
            "inputs": self.inputs,
            "script": self.script.get().strip() or None,
            "output": self.output.get().strip() or None,
            "engine": self.engine.get(),
            "provider": self.provider.get() if self.engine.get() == "cloud" else "groq",
            "model": self.model.get() if self.engine.get() == "local" else None,
            "remove_fillers": self.remove_fillers.get(),
            "burn_subs": self.burn_subs.get(),
            "threshold": round(self.threshold.get(), 3),
            "padding": round(self.padding.get(), 3),
            "max_chars": int(self.max_chars.get()),
            "font": "Arial",
        }

    def _run_dry(self) -> None:
        self._start(dry=True)

    def _run_full(self) -> None:
        self._start(dry=False)

    def _start(self, dry: bool) -> None:
        if self.proc is not None:
            return
        values = self._collect()
        if not values:
            return
        values["dry_run"] = dry
        cmd = build_command(values)

        env = os.environ.copy()
        if values["engine"] == "cloud" and self.api_key.get().strip():
            env["HYPESCRIPT_API_KEY"] = self.api_key.get().strip()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUNBUFFERED"] = "1"

        self.last_output = values["output"] or self._guess_output(values["inputs"][0])
        cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        self.log.delete("1.0", "end")
        self._log(("בדיקה מהירה" if dry else "הפעלה") + " התחילה…\n\n")
        self._set_running(True)

        threading.Thread(target=self._worker, args=(cmd, env, cwd), daemon=True).start()

    def _worker(self, cmd, env, cwd) -> None:
        try:
            self.proc = subprocess.Popen(
                cmd, cwd=cwd, env=env,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", bufsize=1,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            for line in self.proc.stdout:  # type: ignore[union-attr]
                self.q.put(line)
            self.proc.wait()
            self.q.put(f"\n__DONE__{self.proc.returncode}")
        except Exception as exc:  # noqa: BLE001
            self.q.put(f"\nשגיאה בהרצה: {exc}\n__DONE__1")
        finally:
            self.proc = None

    def _drain_queue(self) -> None:
        try:
            while True:
                line = self.q.get_nowait()
                if line.startswith("\n__DONE__") or line.startswith("__DONE__"):
                    rc = line.strip().replace("__DONE__", "") or "1"
                    self._finish(int(rc))
                else:
                    self._log(line)
        except queue.Empty:
            pass
        self.root.after(100, self._drain_queue)

    def _finish(self, rc: int) -> None:
        self._set_running(False)
        if rc == 0:
            self._log("\n✅  הסתיים בהצלחה.\n")
            self.open_btn.configure(state="normal")
        else:
            self._log(f"\n❌  הסתיים עם שגיאה (קוד {rc}). ראה את הפלט למעלה.\n")

    def _set_running(self, running: bool) -> None:
        self.run_btn.configure(state="disabled" if running else "normal")
        self.dry_btn.configure(state="disabled" if running else "normal")
        self.stop_btn.configure(state="normal" if running else "disabled")
        if running:
            self.progress.start(12)
        else:
            self.progress.stop()

    def _stop(self) -> None:
        if self.proc is not None:
            self._log("\n⏹  עוצר…\n")
            try:
                self.proc.terminate()
            except Exception:  # noqa: BLE001
                pass

    def _guess_output(self, first_input: str) -> str:
        base, _ = os.path.splitext(first_input)
        return f"{base}_edited.mp4"

    def _open_output(self) -> None:
        target = self.last_output or ""
        folder = os.path.dirname(os.path.abspath(target)) if target else ""
        if folder and os.path.isdir(folder):
            try:
                os.startfile(folder)  # type: ignore[attr-defined]
            except Exception:  # noqa: BLE001
                pass


def main() -> int:
    root = tk.Tk()
    HypescriptGUI(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env bash
# Safe end-of-turn continuity maintenance for Cursor Agent.
# - Detects relevant edits since the last maintenance pass
# - Requests at most one follow-up (loop_limit=1 + loop_count gate + marker)
# - Fail-open: always exits 0 and prints valid JSON
set +e
set +u

emit() {
  printf '%s\n' "$1"
  exit 0
}

input="$(cat || true)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_DIR="$ROOT/.cursor/hooks/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

status="$(
  printf '%s' "$input" | python3 -c '
import json,sys
try:
    print(json.load(sys.stdin).get("status") or "")
except Exception:
    print("")
' 2>/dev/null
)"
loop_count="$(
  printf '%s' "$input" | python3 -c '
import json,sys
try:
    print(json.load(sys.stdin).get("loop_count", 0))
except Exception:
    print(0)
' 2>/dev/null
)"
conversation_id="$(
  printf '%s' "$input" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
    print(d.get("conversation_id") or d.get("session_id") or "unknown")
except Exception:
    print("unknown")
' 2>/dev/null
)"

# Only act on a clean completed turn, and only on the first stop.
if [ "$status" != "completed" ]; then
  emit '{}'
fi
if [ "${loop_count:-0}" != "0" ]; then
  emit '{}'
fi

marker="$STATE_DIR/maintenance-requested.$conversation_id"
if [ -f "$marker" ]; then
  # A previous stop already requested maintenance for this conversation.
  emit '{}'
fi

EDIT_LOG="$STATE_DIR/edited-files.log"
if [ ! -f "$EDIT_LOG" ] || [ ! -s "$EDIT_LOG" ]; then
  emit '{}'
fi

# Decide if any tracked edit is "relevant" (not continuity-only / not hook state).
relevant="$(
  python3 - "$EDIT_LOG" <<'PY'
import pathlib, re, sys
log = pathlib.Path(sys.argv[1])
paths = [ln.strip() for ln in log.read_text(encoding="utf-8", errors="ignore").splitlines() if ln.strip()]
# Continuity / hook / graph runtime paths that should NOT alone trigger maintenance.
ignore_re = re.compile(
    r'^(?:'
    r'\.ai/HANDOFF\.md|'
    r'\.ai/ACTIVE_WORK\.md|'
    r'\.cursor/hooks/state/|'
    r'graphify-out/(?:cost\.json|cache/|memory/|reflections/|\.graphify|needs_update)'
    r')'
)
# Relevant product/engineering surfaces.
relevant_re = re.compile(
    r'^(?:'
    r'web/|'
    r'local/|'
    r'docs/|'
    r'\.github/|'
    r'package(-lock)?\.json$|'
    r'web/package(-lock)?\.json$|'
    r'local/requirements\.txt$|'
    r'\.gitignore$|'
    r'AGENTS\.md$|'
    r'CLAUDE\.md$|'
    r'RULES\.md$|'
    r'ARCHITECTURE\.md$|'
    r'STACK\.md$|'
    r'ROADMAP.*\.md$|'
    r'\.ai/(?:WORKFLOW|PROJECT_STATE|DECISIONS)\.md$|'
    r'\.cursor/(?:rules|hooks|commands)/|'
    r'\.codex/|'
    r'\.claude/|'
    r'\.agents/|'
    r'graphify-out/(?:graph\.json|GRAPH_REPORT\.md|graph\.html|manifest\.json)'
    r')'
)
for p in paths:
    norm = p.replace('\\', '/').lstrip('./')
    if ignore_re.search(norm):
        continue
    if relevant_re.search(norm):
        print('yes')
        raise SystemExit(0)
print('no')
PY
)"

if [ "$relevant" != "yes" ]; then
  # Clear stale non-relevant edit noise.
  : > "$EDIT_LOG" 2>/dev/null || true
  emit '{}'
fi

# If HANDOFF is already newer than the edit log, maintenance already happened.
handoff="$ROOT/.ai/HANDOFF.md"
if [ -f "$handoff" ] && [ -f "$EDIT_LOG" ]; then
  if [ "$handoff" -nt "$EDIT_LOG" ]; then
    : > "$EDIT_LOG" 2>/dev/null || true
    emit '{}'
  fi
fi

# Mark that we are requesting exactly one maintenance follow-up.
: > "$marker" 2>/dev/null || true
# Clear edit log so the maintenance pass itself does not re-trigger via new edits
# unless new relevant product edits appear afterward (loop_count/marker still block).
: > "$EDIT_LOG" 2>/dev/null || true

msg='End-of-turn continuity maintenance required (automatic, run once then stop):
1) Run appropriate repository-safe verification for the files you changed.
2) Run `graphify update .` if code or tracked graph inputs changed.
3) Update `.ai/HANDOFF.md` and `.ai/ACTIVE_WORK.md` from the real current git/test state (replace stale info; keep HANDOFF under 800 words).
4) Update `.ai/PROJECT_STATE.md` / `.ai/DECISIONS.md` only if stable capabilities or durable decisions changed.
5) Do not start new feature work. Do not request another maintenance pass. Do not deploy. Do not commit secrets.'

python3 -c 'import json,sys; print(json.dumps({"followup_message": sys.argv[1]}, ensure_ascii=False))' "$msg" 2>/dev/null || emit '{}'
exit 0

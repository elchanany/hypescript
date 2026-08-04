#!/usr/bin/env bash
# Track Agent file edits for end-of-turn continuity maintenance.
# Fail-open: never block the agent.
set +e
set +u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_DIR="$ROOT/.cursor/hooks/state"
mkdir -p "$STATE_DIR" 2>/dev/null || exit 0

input="$(cat || true)"
file_path="$(
  printf '%s' "$input" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
    print(d.get("file_path") or "")
except Exception:
    print("")
' 2>/dev/null
)"

if [ -z "$file_path" ]; then
  exit 0
fi

# Normalize to repo-relative when possible.
rel="$file_path"
case "$file_path" in
  "$ROOT"/*) rel="${file_path#"$ROOT"/}" ;;
esac

printf '%s\n' "$rel" >> "$STATE_DIR/edited-files.log" 2>/dev/null || true
# Keep the log bounded.
if [ -f "$STATE_DIR/edited-files.log" ]; then
  tail -n 400 "$STATE_DIR/edited-files.log" > "$STATE_DIR/edited-files.log.tmp" 2>/dev/null \
    && mv "$STATE_DIR/edited-files.log.tmp" "$STATE_DIR/edited-files.log" 2>/dev/null \
    || true
fi

exit 0

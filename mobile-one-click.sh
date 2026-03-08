#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUEUE_FILE="$ROOT_DIR/MOBILE_APP_SESSION_QUEUE.md"
HANDOFF_FILE="$ROOT_DIR/MOBILE_APP_PORT_HANDOFF.md"
RATE_FILE="$ROOT_DIR/MOBILE_APP_RATE_LIMIT_MODE_PROMPT.md"
OUTPUT_FILE="$ROOT_DIR/MOBILE_APP_AUTORUN_PROMPT.md"

MODE="normal"
OPEN_FILE=1
COPY_CLIPBOARD=1

print_help() {
  cat <<'EOF'
Usage: ./mobile-one-click.sh [options]

Options:
  --rate-limit     Use compact rate-limit mode wrapper
  --normal         Use normal mode (default)
  --no-open        Do not open output file in VS Code
  --no-copy        Do not copy output to clipboard
  --status         Print queue progress only
  -h, --help       Show this help

Behavior:
  - Reads completed session count from MOBILE_APP_PORT_HANDOFF.md
  - Selects next prompt from MOBILE_APP_SESSION_QUEUE.md
  - Writes runnable prompt to MOBILE_APP_AUTORUN_PROMPT.md
  - Copies prompt to clipboard and opens file by default
EOF
}

for arg in "$@"; do
  case "$arg" in
    --rate-limit) MODE="rate-limit" ;;
    --normal) MODE="normal" ;;
    --no-open) OPEN_FILE=0 ;;
    --no-copy) COPY_CLIPBOARD=0 ;;
    --status) MODE="status" ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      print_help
      exit 1
      ;;
  esac
done

if [[ ! -f "$QUEUE_FILE" ]]; then
  echo "Missing queue file: $QUEUE_FILE"
  exit 1
fi

if [[ ! -f "$HANDOFF_FILE" ]]; then
  echo "Missing handoff file: $HANDOFF_FILE"
  exit 1
fi

PROMPTS=()
while IFS= read -r prompt_file; do
  [[ -n "$prompt_file" ]] && PROMPTS+=("$prompt_file")
done < <(grep -oE 'MOBILE_APP_SESSION_PROMPT_[A-Z0-9_]+\.md' "$QUEUE_FILE" | awk '!seen[$0]++')

if [[ ${#PROMPTS[@]} -eq 0 ]]; then
  echo "No queued prompts found in $QUEUE_FILE"
  exit 1
fi

COMPLETED_COUNT=$(grep -c '^## Session Update —' "$HANDOFF_FILE" || true)
TOTAL_COUNT=${#PROMPTS[@]}

if [[ "$MODE" == "status" ]]; then
  NEXT_INDEX=$COMPLETED_COUNT
  echo "Progress: $COMPLETED_COUNT/$TOTAL_COUNT sessions completed"
  if (( NEXT_INDEX < TOTAL_COUNT )); then
    echo "Next: ${PROMPTS[$NEXT_INDEX]}"
  else
    echo "All queued sessions completed."
  fi
  exit 0
fi

if (( COMPLETED_COUNT >= TOTAL_COUNT )); then
  echo "All queued sessions are complete."
  echo "Nothing to generate."
  exit 0
fi

NEXT_PROMPT="${PROMPTS[$COMPLETED_COUNT]}"
NEXT_PROMPT_PATH="$ROOT_DIR/$NEXT_PROMPT"

if [[ ! -f "$NEXT_PROMPT_PATH" ]]; then
  echo "Next prompt file not found: $NEXT_PROMPT_PATH"
  exit 1
fi

if [[ "$MODE" == "rate-limit" ]]; then
  if [[ ! -f "$RATE_FILE" ]]; then
    echo "Missing rate-limit prompt file: $RATE_FILE"
    exit 1
  fi
  {
    cat "$RATE_FILE"
    printf '\n\n---\n\n## Selected Session Prompt\n\n'
    cat "$NEXT_PROMPT_PATH"
  } > "$OUTPUT_FILE"
else
  cp "$NEXT_PROMPT_PATH" "$OUTPUT_FILE"
fi

if (( COPY_CLIPBOARD == 1 )) && command -v pbcopy >/dev/null 2>&1; then
  pbcopy < "$OUTPUT_FILE"
fi

if (( OPEN_FILE == 1 )) && command -v code >/dev/null 2>&1; then
  code "$OUTPUT_FILE" >/dev/null 2>&1 || true
fi

echo "Generated: MOBILE_APP_AUTORUN_PROMPT.md"
echo "Mode: $MODE"
echo "Selected session: $NEXT_PROMPT"
echo "Progress after completion will become: $((COMPLETED_COUNT + 1))/$TOTAL_COUNT"

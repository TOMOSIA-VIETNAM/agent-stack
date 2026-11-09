#!/usr/bin/env bash
# Claude Code PostToolUse hook: format the edited .dart file.
# Reads hook JSON on stdin. Exit 2 -> stderr is shown to Claude.
set -uo pipefail

file="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[[ -z "$file" || "$file" != *.dart || ! -f "$file" ]] && exit 0

# Never format generated files.
case "$file" in *.g.dart|*.freezed.dart|*.mocks.dart) exit 0 ;; esac

if ! out="$(dart format "$file" 2>&1)"; then
  echo "dart format failed for $file:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0

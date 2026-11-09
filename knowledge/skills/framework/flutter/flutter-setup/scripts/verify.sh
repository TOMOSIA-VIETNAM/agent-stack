#!/usr/bin/env bash
# Definition of done for Flutter work: format check -> analyze -> test.
#
# Usage: verify.sh [--no-test] [--write-baseline] [files...]
#   files            .dart files to format-check (default: changed vs HEAD incl. untracked;
#                    outside git: lib test integration_test)
#   --write-baseline record the current analyzer issue count in .analyze-baseline
#
# Analyze gate:
#   no .analyze-baseline  -> total issues must be 0 (new projects)
#   .analyze-baseline = N -> no issues in touched files AND total <= N (retrofit)
set -euo pipefail

run_tests=1; write_baseline=0; args=()
for a in "$@"; do
  case "$a" in
    --no-test) run_tests=0 ;;
    --write-baseline) write_baseline=1 ;;
    *) args+=("$a") ;;
  esac
done

targets=("${args[@]+"${args[@]}"}")
if [[ ${#targets[@]} -eq 0 ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    while IFS= read -r f; do
      [[ -f "$f" && "$f" != *.g.dart && "$f" != *.freezed.dart && "$f" != *.mocks.dart ]] && targets+=("$f")
    done < <({ git diff --name-only HEAD -- '*.dart'; git ls-files --others --exclude-standard -- '*.dart'; } | sort -u)
  else
    for d in lib test integration_test; do [[ -d "$d" ]] && targets+=("$d"); done
  fi
fi

if [[ ${#targets[@]} -gt 0 ]]; then
  echo "==> dart format --set-exit-if-changed ${targets[*]}"
  dart format --set-exit-if-changed "${targets[@]}"
else
  echo "==> no changed .dart files to format-check"
fi

echo "==> flutter analyze"
analyze_out="$(flutter analyze --no-pub 2>&1 || true)"
printf '%s\n' "$analyze_out"
total="$(printf '%s\n' "$analyze_out" | grep -cE '^\s+(info|warning|error) •' || true)"

if [[ $write_baseline -eq 1 ]]; then
  echo "$total" > .analyze-baseline
  echo "baseline written: $total"
elif [[ -f .analyze-baseline ]]; then
  baseline="$(tr -d '[:space:]' < .analyze-baseline)"
  touched=0
  for f in "${targets[@]+"${targets[@]}"}"; do
    [[ -f "$f" ]] || continue
    n="$(printf '%s\n' "$analyze_out" | grep -cF "• $f:" || true)"
    touched=$((touched + n))
  done
  if [[ $touched -gt 0 ]]; then echo "FAIL: $touched analyzer issue(s) in touched files"; exit 1; fi
  if [[ $total -gt $baseline ]]; then echo "FAIL: total issues $total > baseline $baseline"; exit 1; fi
  echo "analyze OK (total $total <= baseline $baseline, 0 in touched files)"
else
  if [[ $total -gt 0 ]]; then echo "FAIL: $total analyzer issue(s)"; exit 1; fi
fi

if [[ $run_tests -eq 1 && -d test ]]; then
  echo "==> flutter test"
  flutter test
fi

echo "VERIFY OK"

#!/usr/bin/env python3
"""Validate JSON locale files against a base file.

Usage: validate_locales.py <locale_dir> <base_file_name>   e.g. assets/languages en.json
Checks: missing keys, extra keys, placeholder ({name}) mismatches. Nested keys are flattened with dots.
Exit 1 on any problem.
"""
import json
import re
import sys
from pathlib import Path

PLACEHOLDER = re.compile(r"\{[^{}]*\}")


def flatten(data, prefix=""):
    out = {}
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            out.update(flatten(value, path))
        else:
            out[path] = str(value)
    return out


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    directory, base_name = Path(sys.argv[1]), sys.argv[2]
    base = flatten(json.loads((directory / base_name).read_text(encoding="utf-8")))
    problems = 0
    for file in sorted(directory.glob("*.json")):
        if file.name == base_name:
            continue
        other = flatten(json.loads(file.read_text(encoding="utf-8")))
        for key in sorted(base.keys() - other.keys()):
            print(f"{file.name}: missing {key}")
            problems += 1
        for key in sorted(other.keys() - base.keys()):
            print(f"{file.name}: extra {key}")
            problems += 1
        for key in sorted(base.keys() & other.keys()):
            if sorted(PLACEHOLDER.findall(base[key])) != sorted(PLACEHOLDER.findall(other[key])):
                print(f"{file.name}: placeholder mismatch {key}")
                problems += 1
    print("OK" if problems == 0 else f"{problems} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())

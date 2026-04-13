"""Validate translation files for the EPP Grid integration and frontend.

Checks performed:

Python (custom_components/eppgrid):
  - strings.json must equal translations/en.json
  - every additional translations/<locale>.json must have the same key set as en.json

TypeScript (frontend/src):
  - every translation key referenced from non-test source must exist in en.json
  - every leaf key in en.json must be referenced somewhere in non-test source
  - every additional translations/<locale>.json must have the same key set as en.json

Run via the pre-push hook or directly:
    python scripts/check_translations.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

LOCALIZE_CALL = re.compile(r'localize\(\s*["\'`]([^"\'`]+)["\'`]')
# `errorKey: "x.y"` (TS) and `"error_key": "x.y"` / `error_key="x.y"` (Python)
# both reference frontend translation keys that must exist in en.json.
ERROR_KEY_REFERENCE = re.compile(r'(?:errorKey\s*:|["\']?error_key["\']?\s*[:=])\s*["\']([^"\']+)["\']')
# Match template-literal prefixes like `settings.log_level.${level}` or
# `flasher.errors.${code}`. Captures the constant prefix before "${".
TEMPLATE_LITERAL_PREFIX = re.compile(r"`([a-z][a-zA-Z0-9_.]*)\.\$\{")


def flatten_keys(obj: object, prefix: str = "") -> set[str]:
    """Return the set of dotted leaf-key paths for a nested dict."""
    keys: set[str] = set()
    if not isinstance(obj, dict):
        return keys
    for k, v in obj.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys |= flatten_keys(v, full)
        else:
            keys.add(full)
    return keys


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def _check_locale_parity(translations_dir: Path, en_keys: set[str]) -> list[str]:
    """All non-en locale files must contain exactly the same key set as en.json."""
    errors: list[str] = []
    for locale_file in sorted(translations_dir.glob("*.json")):
        if locale_file.name == "en.json":
            continue
        keys = flatten_keys(_load_json(locale_file))
        missing = en_keys - keys
        extra = keys - en_keys
        if missing:
            errors.append(f"{locale_file.name}: missing keys vs en.json: {sorted(missing)}")
        if extra:
            errors.append(f"{locale_file.name}: extra keys vs en.json: {sorted(extra)}")
    return errors


def check_python_translations(component_dir: Path) -> list[str]:
    """Validate Python integration translations."""
    errors: list[str] = []
    strings = _load_json(component_dir / "strings.json")
    en = _load_json(component_dir / "translations" / "en.json")
    if strings != en:
        errors.append(
            "strings.json and translations/en.json are out of sync — copy strings.json to translations/en.json"
        )
    errors.extend(_check_locale_parity(component_dir / "translations", flatten_keys(en)))
    return errors


def _iter_source_files(src_dir: Path, suffixes: tuple[str, ...] = (".ts",)) -> list[Path]:
    """All matching files under src_dir, excluding test trees."""
    files: list[Path] = []
    for suffix in suffixes:
        for p in src_dir.rglob(f"*{suffix}"):
            if "__tests__" in p.parts or p.name.endswith(".test.ts"):
                continue
            if p.name.startswith("test_") or p.parent.name == "tests":
                continue
            files.append(p)
    return files


def _read_source_blob(src_dirs: list[Path]) -> str:
    """Concatenate non-test .ts and .py source from each given dir."""
    parts: list[str] = []
    for d in src_dirs:
        for p in _iter_source_files(d, suffixes=(".ts", ".py")):
            parts.append(p.read_text())
    return "\n".join(parts)


def extract_referenced_keys(
    src_dir: Path,
    candidate_keys: set[str],
    extra_source_dirs: list[Path] | None = None,
) -> set[str]:
    """Return the subset of candidate_keys that appear in non-test source.

    A key counts as referenced if any of these match:
      - localize("X") call (TS/JS)
      - quoted string literal "X" or 'X' anywhere in the source (covers
        data-driven keys like `label: "furniture.sofa"` resolved via
        `localize(item.label)`)
      - template literal prefix like `X.${var}` covers any candidate key
        starting with `X.` (covers `settings.log_level.${level}`)
      - same checks against optional extra source dirs (e.g. Python code that
        emits frontend translation keys via WebSocket payloads)
    """
    src_dirs = [src_dir, *(extra_source_dirs or [])]
    blob = _read_source_blob(src_dirs)

    direct = set(LOCALIZE_CALL.findall(blob))
    template_prefixes = set(TEMPLATE_LITERAL_PREFIX.findall(blob))

    referenced = set(direct)
    referenced |= set(ERROR_KEY_REFERENCE.findall(blob))
    for k in candidate_keys:
        if k in referenced:
            continue
        if f'"{k}"' in blob or f"'{k}'" in blob or f"`{k}`" in blob:
            referenced.add(k)
            continue
        if any(k == prefix or k.startswith(f"{prefix}.") for prefix in template_prefixes):
            referenced.add(k)
    return referenced


def _extract_direct_key_references(src_dirs: list[Path]) -> set[str]:
    """Extract static keys referenced via known patterns.

    Filters out dynamic template-literal captures (containing ${...}); those
    are handled by TEMPLATE_LITERAL_PREFIX in the orphan-side check instead.
    """
    blob = _read_source_blob(src_dirs)
    refs = set(LOCALIZE_CALL.findall(blob)) | set(ERROR_KEY_REFERENCE.findall(blob))
    return {k for k in refs if "${" not in k}


def check_typescript_translations(
    src_dir: Path, extra_source_dirs: list[Path] | None = None
) -> tuple[list[str], list[str]]:
    """Validate frontend translations.

    Returns (errors, warnings). All checks (missing, orphan, locale parity) are
    hard errors. The warnings list is reserved for future use.
    """
    errors: list[str] = []
    warnings: list[str] = []
    en_path = src_dir / "translations" / "en.json"
    en = _load_json(en_path)
    en_keys = flatten_keys(en)

    direct_refs = _extract_direct_key_references([src_dir, *(extra_source_dirs or [])])
    for k in sorted(k for k in direct_refs if k not in en_keys):
        errors.append(f"missing key in translations/en.json: {k}")

    referenced = extract_referenced_keys(src_dir, en_keys, extra_source_dirs)
    for k in sorted(en_keys - referenced):
        errors.append(f"orphan key in translations/en.json (no reference found): {k}")

    errors.extend(_check_locale_parity(src_dir / "translations", en_keys))
    return errors, warnings


def main(repo_root: Path | None = None) -> int:
    root = repo_root or Path(__file__).resolve().parent.parent
    component_dir = root / "custom_components" / "eppgrid"
    py_errors = check_python_translations(component_dir)
    ts_errors, ts_warnings = check_typescript_translations(root / "frontend" / "src", extra_source_dirs=[component_dir])

    if py_errors:
        print("Python translation errors:", file=sys.stderr)
        for e in py_errors:
            print(f"  - {e}", file=sys.stderr)
    if ts_errors:
        print("TypeScript translation errors:", file=sys.stderr)
        for e in ts_errors:
            print(f"  - {e}", file=sys.stderr)
    if ts_warnings:
        print("TypeScript translation warnings:", file=sys.stderr)
        for w in ts_warnings:
            print(f"  - {w}", file=sys.stderr)
    return 1 if py_errors or ts_errors else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    sys.exit(main())

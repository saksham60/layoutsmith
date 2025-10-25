
#!/usr/bin/env python3
"""
Repo scanner for LayoutSmith: migrate session -> cookie
It performs three searches (grep-style) and prints + writes a report.

Usage:
  python scan_layoutsmith.py --root .
  python scan_layoutsmith.py --root /path/to/repo --report scan_report.txt
"""

from pathlib import Path
import argparse
import re
import sys
from datetime import datetime

IGNORE_DIRS = {
    "node_modules", ".git", ".next", ".vercel", "dist", "build", "out",
    ".turbo", "coverage", "tmp", "__pycache__", ".cache"
}

# Reasonable default code/text extensions
CODE_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".css", ".scss", ".sass",
    ".md", ".mdx", ".html",
    ".yml", ".yaml", ".env", ".txt"
}

SEARCHES = [
    (
        "Session storage usage",
        re.compile(r"(sessionStorage\.|window\.sessionStorage)", re.IGNORECASE),
    ),
    (
        "Token prop / session variable patterns",
        # Case-insensitive; keep it slightly liberal
        re.compile(r"(figma[^\\n]{0,80}token|accessToken|refreshToken)", re.IGNORECASE),
    ),
    (
        "API routes / callback references",
        re.compile(r"(/api/figma/|figma/callback)", re.IGNORECASE),
    ),
]

def iter_files(root: Path):
    for p in root.rglob("*"):
        if p.is_dir():
            # Skip ignored dirs
            rel_parts = set(p.parts)
            if rel_parts & IGNORE_DIRS:
                # pruning by skipping children if this directory is ignored
                # Unfortunately Path.rglob doesn't support pruning directly,
                # so we rely on the fact that we simply won't iterate children of ignored dirs
                # by not yielding directory entries. However rglob will still walk them.
                # For strict pruning you'd need os.walk; but this is usually fine.
                continue
            continue
        if not p.is_file():
            continue
        # Skip ignored dirs again for files (in case of direct hits)
        if set(p.parts) & IGNORE_DIRS:
            continue
        yield p

def looks_like_text_file(path: Path) -> bool:
    # If extension is known text/code, accept
    if path.suffix in CODE_EXTS:
        return True
    # Allow small untyped files (fallback)
    try:
        if path.stat().st_size <= 1_500_000:  # 1.5MB
            return True
    except Exception:
        return False
    return False

def search_file(path: Path, pattern: re.Pattern):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    results = []
    # Grep-like: check line by line for matches to get accurate line numbers
    for i, line in enumerate(text.splitlines(), start=1):
        if pattern.search(line):
            # Trim overly long lines in output for readability
            snippet = line.rstrip("\n")
            if len(snippet) > 300:
                snippet = snippet[:297] + "..."
            results.append((i, snippet))
    return results

def run(root: Path, report_file: Path):
    if not root.exists():
        print(f"[ERROR] Root not found: {root}", file=sys.stderr)
        sys.exit(2)

    all_results = []
    files_scanned = 0

    for title, pattern in SEARCHES:
        all_results.append((title, []))

    for path in iter_files(root):
        if not looks_like_text_file(path):
            continue
        files_scanned += 1
        rel = path.relative_to(root)
        for idx, (title, pattern) in enumerate(SEARCHES):
            matches = search_file(path, pattern)
            if matches:
                # Store as (relative_path, (line_no, line_text), ...)
                all_results[idx][1].append((rel, matches))

    # Output
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header = f"LayoutSmith Scanner Report — {ts}\nRoot: {root.resolve()}\nFiles scanned: {files_scanned}\n"
    out_lines = [header, "="*80]

    total_hits = 0
    for title, entries in all_results:
        out_lines.append(f"\n## {title}\n")
        if not entries:
            out_lines.append("  (no matches)\n")
            continue
        for rel, matches in sorted(entries, key=lambda x: str(x[0])):
            for (lineno, line) in matches:
                out_lines.append(f"{rel}:{lineno}: {line}")
                total_hits += 1
        out_lines.append("")

    summary = f"\nSummary: {total_hits} total matches across {files_scanned} files.\n"
    out_lines.append(summary)

    # Print to stdout
    print("\n".join(out_lines))

    # Write report
    try:
        report_file.write_text("\n".join(out_lines), encoding="utf-8")
        print(f"\nSaved report to: {report_file.resolve()}")
    except Exception as e:
        print(f"[WARN] Could not write report file: {e}", file=sys.stderr)

def main():
    ap = argparse.ArgumentParser(description="Scan a repo for session->cookie migration targets.")
    ap.add_argument("--root", type=Path, default=Path("src"), help="Root directory to scan (default: ./src)")
    ap.add_argument("--report", type=Path, default=Path("scan_report.txt"), help="Where to save the report file")
    args = ap.parse_args()
    run(args.root, args.report)

if __name__ == "__main__":
    main()

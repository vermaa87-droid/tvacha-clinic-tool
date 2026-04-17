#!/usr/bin/env bash
# Captures a consistent set of perf metrics for the Tvacha Clinic Next.js app.
# Usage:
#   ./measure.sh baseline
#   ./measure.sh after-phase-1
# Output goes to ./perf-reports/<label>/

set -euo pipefail

LABEL="${1:-baseline}"
OUT="perf-reports/$LABEL"
mkdir -p "$OUT"

echo "[measure] clean build..."
rm -rf .next
npm run build 2>&1 | tee "$OUT/build.txt"

echo "[measure] static asset totals..."
du -sh .next/static > "$OUT/static-size.txt" 2>&1 || true
du -sh .next/server > "$OUT/server-size.txt" 2>&1 || true

echo "[measure] chunk breakdown..."
ls -lhS .next/static/chunks | head -30 > "$OUT/top-chunks.txt"

echo "[measure] source stats..."
{
  echo "files: $(find app components lib -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null | wc -l)"
  echo "lines: $(find app components lib -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null -exec cat {} \; | wc -l)"
  echo "divs:  $(grep -r '<div' app components 2>/dev/null | wc -l)"
  echo "use client: $(grep -rl 'use client' app components 2>/dev/null | wc -l)"
} > "$OUT/source-stats.txt"

echo "[measure] done → $OUT/"
ls -la "$OUT"

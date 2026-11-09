#!/usr/bin/env bash
# Lightweight secret scan for the entry repo (no network).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "== secret-scan: $ROOT =="
FAIL=0

if command -v gitleaks >/dev/null 2>&1; then
  echo "-- gitleaks --"
  gitleaks detect --source . --no-git -v || FAIL=1
fi

echo "-- rg patterns on non-ignored text --"
# OpenAI-style keys
if rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!demo/*.cast' -g '!demo/*.mp4' -g '!demo/*.png' -g '!*.bundle' \
  -e 'sk-[A-Za-z0-9]{20,}' . 2>/dev/null; then
  echo "HIT OpenAI-style key"; FAIL=1
fi
# Explicit env assignments of secrets
if rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!demo/**' -g '!*.bundle' \
  -e 'SERV_API_KEY\s*=\s*['\''\"]?[A-Za-z0-9_-]{16,}' . 2>/dev/null; then
  echo "HIT SERV_API_KEY assignment"; FAIL=1
fi
# PEM private keys
if rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!demo/**' \
  -e 'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY' . 2>/dev/null; then
  echo "HIT PEM private key"; FAIL=1
fi
# Private key hex only when labelled as a key (not public tx hashes)
if rg -n --hidden -g '!.git/**' -g '!node_modules/**' -g '!demo/**' -g '!*.bundle' \
  -e '(private[_-]?key|PRIVATE_KEY|secret[_-]?key)\s*[:=]\s*0x[a-fA-F0-9]{64}' . 2>/dev/null; then
  echo "HIT labelled private key hex"; FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "SECRET SCAN FAILED"
  exit 1
fi
echo "SECRET SCAN CLEAN"

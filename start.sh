#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="8764"
HOST="${HOST:-0.0.0.0}"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Please install Node.js 18+ first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Please install npm first." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f app_config.json ]; then
  echo "app_config.json is required. Please create it before starting the service." >&2
  exit 1
fi

mkdir -p create_file

detect_chrome_path() {
  if [ -n "${CHROME_PATH:-}" ] && [ -x "$CHROME_PATH" ]; then
    return 0
  fi

  local candidates="
/snap/bin/chromium
/usr/bin/chromium
/usr/bin/chromium-browser
/usr/bin/google-chrome
/usr/bin/google-chrome-stable
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
"

  local candidate=""
  while IFS= read -r candidate; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      export CHROME_PATH="$candidate"
      return 0
    fi
  done <<EOF
$candidates
EOF

  return 0
}

detect_cwebp_path() {
  if [ -n "${CWEBP_PATH:-}" ] && [ -x "$CWEBP_PATH" ]; then
    return 0
  fi

  local candidates="
/usr/bin/cwebp
/usr/local/bin/cwebp
/opt/homebrew/bin/cwebp
"

  local candidate=""
  while IFS= read -r candidate; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      export CWEBP_PATH="$candidate"
      return 0
    fi
  done <<EOF
$candidates
EOF

  return 0
}

detect_chrome_path
detect_cwebp_path

detect_mango_tmp_dir() {
  if [ -n "${MANGO_TMP_DIR:-}" ]; then
    mkdir -p "$MANGO_TMP_DIR"
    return 0
  fi

  if [ "${CHROME_PATH:-}" = "/snap/bin/chromium" ]; then
    export MANGO_TMP_DIR="${HOME}/snap/chromium/common/mango-money-tmp"
  else
    export MANGO_TMP_DIR="${ROOT_DIR}/create_file/_tmp"
  fi

  mkdir -p "$MANGO_TMP_DIR"
}

detect_mango_tmp_dir

kill_port_processes() {
  local port="$1"
  local pids=""
  local current_pid="$$"
  local parent_pid="${PPID:-}"

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi

  if [ -z "$pids" ] && command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp "sport = :$port" 2>/dev/null \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | sort -u || true)"
  fi

  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$port"/tcp 2>/dev/null || true)"
  fi

  if [ -z "$pids" ]; then
    return 0
  fi

  local filtered=""
  for pid in $pids; do
    if [ "$pid" != "$current_pid" ] && [ "$pid" != "$parent_pid" ]; then
      filtered="${filtered} ${pid}"
    fi
  done
  pids="$filtered"

  if [ -z "$pids" ]; then
    return 0
  fi

  echo "Port ${port} is in use. Stopping: ${pids}"
  kill $pids 2>/dev/null || true
  sleep 1

  local alive=""
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      alive="${alive} ${pid}"
    fi
  done

  if [ -n "$alive" ]; then
    echo "Force stopping:${alive}"
    kill -9 $alive 2>/dev/null || true
  fi

  for _ in 1 2 3 4 5; do
    if ! is_port_in_use "$port"; then
      return 0
    fi
    sleep 1
  done
}

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port" && return 0
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "$port"/tcp >/dev/null 2>&1 && return 0
  fi

  return 1
}

echo "Starting Mango Money frontend and backend"
echo "URL: http://localhost:${PORT}"
echo "Host: ${HOST}"
if [ -n "${CHROME_PATH:-}" ]; then
  echo "Chrome: ${CHROME_PATH}"
fi
if [ -n "${CWEBP_PATH:-}" ]; then
  echo "cwebp: ${CWEBP_PATH}"
fi
echo "Temp: ${MANGO_TMP_DIR}"

npm run build

rm -rf .runtime/mango-finance-receipt

kill_port_processes "$PORT"

echo "Frontend build directory: ${ROOT_DIR}/build"
echo "Backend API: http://127.0.0.1:${PORT}/api"

exec env PORT="$PORT" HOST="$HOST" CHROME_PATH="${CHROME_PATH:-}" CWEBP_PATH="${CWEBP_PATH:-}" MANGO_TMP_DIR="${MANGO_TMP_DIR:-}" node server.js

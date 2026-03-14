#!/bin/bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "  ⚡ C Daily Challenge"
echo "  ─────────────────────────────"
echo ""

# ── Node.js check ─────────────────────────────────────────────────────────────
find_node() {
  for p in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.nvm/versions/node/"*/bin/node \
    "$HOME/.volta/bin/node" \
    /usr/bin/node; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

NODE_BIN=$(find_node 2>/dev/null || true)

if [ -z "$NODE_BIN" ]; then
  # Try nvm in .zshrc/.bashrc
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" 2>/dev/null
  NODE_BIN=$(which node 2>/dev/null || true)
fi

if [ -z "$NODE_BIN" ] && command -v brew &>/dev/null; then
  echo "  Node.js non trouvé — installation via Homebrew..."
  brew install node --quiet
  NODE_BIN=$(which node)
fi

if [ -z "$NODE_BIN" ]; then
  echo "  ❌ Node.js introuvable."
  echo "     Installe-le avec: brew install node"
  echo "     Ou depuis: https://nodejs.org"
  exit 1
fi

NPM_BIN="$(dirname "$NODE_BIN")/npm"
echo "  ✓ Node.js: $NODE_BIN"

# ── Python check ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "  ❌ Python3 non trouvé. Installe avec: brew install python"
  exit 1
fi

# ── gcc check ─────────────────────────────────────────────────────────────────
if ! command -v gcc &>/dev/null; then
  echo "  ❌ gcc non trouvé. Installe Xcode Command Line Tools:"
  echo "     xcode-select --install"
  exit 1
fi
echo "  ✓ gcc: $(gcc --version | head -1)"

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "  [1/3] Préparation du backend..."
cd "$DIR/backend"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

echo "  [2/3] Démarrage du backend (port 8000)..."
uvicorn main:app --host 127.0.0.1 --port 8000 --reload --log-level warning &
BACKEND_PID=$!

# Wait for backend to be ready
for i in {1..15}; do
  curl -s http://127.0.0.1:8000/stats > /dev/null 2>&1 && break
  sleep 0.5
done

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "  [3/3] Préparation du frontend..."
cd "$DIR/frontend"

if [ ! -d "node_modules" ]; then
  "$NPM_BIN" install --silent --no-fund --no-audit 2>&1 | grep -v "^$" || true
fi

echo ""
echo "  ✅ Tout est prêt !"
echo "  → Application: http://localhost:5173"
echo "  → API:         http://localhost:8000/docs"
echo ""
echo "  L'app va s'ouvrir dans le navigateur dans quelques secondes..."
echo "  Ctrl+C pour tout arrêter"
echo ""

# Open browser after 3s
(sleep 3 && open http://localhost:5173) &

# Cleanup on exit
cleanup() {
  echo ""
  echo "  Arrêt..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

"$NPM_BIN" run dev

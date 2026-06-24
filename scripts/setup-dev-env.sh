#!/usr/bin/env bash
#
# setup-dev-env.sh — turn-key dev environment bootstrap for Ubuntu / WSL.
#
# Installs everything needed to work on this repo (see CLAUDE.md §11), idempotently
# (safe to re-run — each step skips what's already present):
#   * apt build tools: make, build-essential, curl, ca-certificates, gnupg, git
#   * nvm + Node (default 24, or .nvmrc / --node)            — the Astro frontend
#   * uv (Astral) for Python dependency management           — build.py + authoring
#   * Docker Engine + compose plugin (skip with --no-docker) — the make docker-* targets
#   * the project's Python venv (uv) and Node deps (npm ci)
#   * "direnv-lite" venv auto-activation in ~/.bashrc        — make targets call bare `python`
#
# Usage:
#   scripts/setup-dev-env.sh [PROJECT_DIR] [options]
#
# PROJECT_DIR defaults to this repo's root when omitted.
#
# Options:
#   --node VERSION       Node major/version to install (default: .nvmrc, else 24)
#   --python VERSION     Python for the venv (default: 3.14, falls back to system)
#   --extra-pip "a b c"  Extra pip packages for the venv (default: authoring deps)
#   --no-docker          Skip Docker installation
#   --no-project         Only install system tools; skip venv / npm ci / .bashrc hook
#   -h, --help           Show this help
#
# Examples:
#   scripts/setup-dev-env.sh                       # provision this repo, full stack
#   scripts/setup-dev-env.sh --no-docker           # skip Docker
#   scripts/setup-dev-env.sh ~/other-repo --node 22
#
set -euo pipefail

# ---- defaults -------------------------------------------------------------
PROJECT_DIR=""
NODE_VERSION=""               # resolved later (arg > .nvmrc > 24)
PYTHON_VERSION="3.14"
EXTRA_PIP="requests Pillow python-dotenv"   # authoring-only deps (icon scripts); not in requirements.txt
INSTALL_DOCKER=1
SETUP_PROJECT=1
# Docker has no apt channel for the newest Ubuntu interim releases; fall back here.
DOCKER_CODENAME_FALLBACK="noble"

# ---- pretty logging -------------------------------------------------------
c_blue=$'\033[0;34m'; c_green=$'\033[0;32m'; c_yellow=$'\033[0;33m'; c_red=$'\033[0;31m'; c_reset=$'\033[0m'
step() { printf '%s\n==> %s%s\n' "$c_blue" "$1" "$c_reset"; }
ok()   { printf '%s    ✓ %s%s\n' "$c_green" "$1" "$c_reset"; }
skip() { printf '%s    • %s (already present)%s\n' "$c_yellow" "$1" "$c_reset"; }
warn() { printf '%s    ! %s%s\n' "$c_yellow" "$1" "$c_reset"; }
die()  { printf '%s✗ %s%s\n' "$c_red" "$1" "$c_reset" >&2; exit 1; }

# ---- arg parsing ----------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --node)       NODE_VERSION="$2"; shift 2;;
    --python)     PYTHON_VERSION="$2"; shift 2;;
    --extra-pip)  EXTRA_PIP="$2"; shift 2;;
    --no-docker)  INSTALL_DOCKER=0; shift;;
    --no-project) SETUP_PROJECT=0; shift;;
    -h|--help)    sed -n '2,30p' "$0"; exit 0;;
    -*)           die "unknown option: $1";;
    *)            PROJECT_DIR="$1"; shift;;
  esac
done

[ "$(uname -s)" = "Linux" ] || die "this script targets Linux (Ubuntu/WSL)."
command -v apt-get >/dev/null || die "apt-get not found — this script targets Debian/Ubuntu."

# Default PROJECT_DIR to the repo root (this script lives in <repo>/scripts/).
if [ -z "$PROJECT_DIR" ] && [ "$SETUP_PROJECT" -eq 1 ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$SCRIPT_DIR/../requirements.txt" ]; then
    PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  fi
fi

# ---- 1. apt build tools ---------------------------------------------------
step "System packages (apt)"
NEED_APT=()
for pkg in make build-essential curl ca-certificates gnupg git; do
  dpkg -s "$pkg" >/dev/null 2>&1 || NEED_APT+=("$pkg")
done
if [ ${#NEED_APT[@]} -gt 0 ]; then
  sudo apt-get update -y -qq
  sudo apt-get install -y -qq "${NEED_APT[@]}"
  ok "installed: ${NEED_APT[*]}"
else
  skip "make, build-essential, curl, ca-certificates, gnupg, git"
fi

# ---- 2. nvm + Node --------------------------------------------------------
step "nvm + Node"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash >/dev/null 2>&1
  ok "nvm installed"
else
  skip "nvm"
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
# Resolve Node version: --node arg > project .nvmrc > 24
if [ -z "$NODE_VERSION" ]; then
  if [ -n "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/.nvmrc" ]; then
    NODE_VERSION="$(tr -d ' \t\r\n' < "$PROJECT_DIR/.nvmrc")"
  else
    NODE_VERSION="24"
  fi
fi
if nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
  skip "Node $NODE_VERSION"
else
  nvm install "$NODE_VERSION" >/dev/null 2>&1
  ok "Node $NODE_VERSION installed"
fi
nvm alias default "$NODE_VERSION" >/dev/null 2>&1
nvm use "$NODE_VERSION" >/dev/null 2>&1
ok "node $(node --version) / npm $(npm --version)"

# ---- 3. uv ----------------------------------------------------------------
step "uv (Astral)"
export PATH="$HOME/.local/bin:$PATH"
if command -v uv >/dev/null 2>&1; then
  skip "uv ($(uv --version))"
else
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
  command -v uv >/dev/null 2>&1 || die "uv install failed"
  ok "uv installed ($(uv --version))"
fi

# ---- 4. Docker ------------------------------------------------------------
if [ "$INSTALL_DOCKER" -eq 1 ]; then
  step "Docker Engine"
  if command -v docker >/dev/null 2>&1; then
    skip "docker ($(docker --version 2>/dev/null | awk '{print $3}' | tr -d ,))"
  else
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    # Pick a codename Docker actually publishes for (newest Ubuntu often missing).
    . /etc/os-release
    CODENAME="${VERSION_CODENAME:-$DOCKER_CODENAME_FALLBACK}"
    if ! curl -fsI "https://download.docker.com/linux/ubuntu/dists/${CODENAME}/Release" >/dev/null 2>&1; then
      warn "Docker has no '${CODENAME}' channel; falling back to '${DOCKER_CODENAME_FALLBACK}'"
      CODENAME="$DOCKER_CODENAME_FALLBACK"
    fi
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ok "Docker installed (repo: ${CODENAME})"
  fi
  # group + service (idempotent)
  if ! id -nG "$USER" | tr ' ' '\n' | grep -qx docker; then
    sudo usermod -aG docker "$USER"
    warn "added $USER to 'docker' group — effective in a NEW shell (or run: newgrp docker)"
  else
    skip "$USER in docker group"
  fi
  if pidof systemd >/dev/null 2>&1; then
    sudo systemctl enable --now docker >/dev/null 2>&1 && ok "docker service enabled"
  else
    warn "systemd not PID 1 — enable it in /etc/wsl.conf ([boot] systemd=true) then 'wsl --shutdown'"
  fi
else
  step "Docker — skipped (--no-docker)"
fi

# ---- 5. project setup (venv + node deps) ----------------------------------
if [ "$SETUP_PROJECT" -eq 1 ] && [ -n "$PROJECT_DIR" ]; then
  PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"  # absolutize
  step "Project: $PROJECT_DIR"

  # Python venv via uv
  if [ -f "$PROJECT_DIR/requirements.txt" ]; then
    if [ ! -d "$PROJECT_DIR/.venv" ]; then
      ( cd "$PROJECT_DIR" && uv venv --python "$PYTHON_VERSION" >/dev/null 2>&1 ) \
        || ( cd "$PROJECT_DIR" && uv venv >/dev/null 2>&1 )  # fall back to system python
      ok ".venv created"
    else
      skip ".venv"
    fi
    ( cd "$PROJECT_DIR" && uv pip install -q -r requirements.txt $EXTRA_PIP )
    ok "python deps installed (requirements.txt${EXTRA_PIP:+ + $EXTRA_PIP})"
  else
    warn "no requirements.txt — skipping Python venv"
  fi

  # Node deps
  if [ -f "$PROJECT_DIR/package.json" ]; then
    if [ -f "$PROJECT_DIR/package-lock.json" ]; then
      ( cd "$PROJECT_DIR" && npm ci ) && ok "npm ci complete"
    else
      ( cd "$PROJECT_DIR" && npm install ) && ok "npm install complete"
    fi
  else
    warn "no package.json — skipping Node deps"
  fi
elif [ "$SETUP_PROJECT" -eq 1 ]; then
  step "Project setup — skipped (could not locate repo root; pass PROJECT_DIR)"
fi

# ---- 6. venv auto-activation in ~/.bashrc ---------------------------------
if [ "$SETUP_PROJECT" -eq 1 ]; then
  step "venv auto-activation (~/.bashrc)"
  MARKER="# --- auto-activate Python venv (direnv-lite)"
  if grep -qF "$MARKER" "$HOME/.bashrc" 2>/dev/null; then
    skip "auto-venv hook"
  else
    cat >> "$HOME/.bashrc" <<'EOF'

# --- auto-activate Python venv (direnv-lite, added by scripts/setup-dev-env.sh) ---
# Walks up from $PWD; activates the nearest .venv, deactivates on leaving.
# Needed because the Makefile targets invoke bare `python`.
_auto_venv() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.venv/bin/activate" ]; then
      [ "$VIRTUAL_ENV" != "$dir/.venv" ] && source "$dir/.venv/bin/activate"
      return
    fi
    dir="$(dirname "$dir")"
  done
  if [ -n "$VIRTUAL_ENV" ] && declare -f deactivate >/dev/null; then
    deactivate
  fi
}
cd() { builtin cd "$@" && _auto_venv; }
_auto_venv  # run once for the shell's starting directory
# --- end auto-activate ---
EOF
    ok "auto-venv hook appended"
  fi
fi

# ---- done -----------------------------------------------------------------
printf '\n%s✓ Dev environment ready.%s\n' "$c_green" "$c_reset"
echo "  Open a new shell (or 'source ~/.bashrc') to pick up nvm, uv, the docker group, and venv auto-activation."

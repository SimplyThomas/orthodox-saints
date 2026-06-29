#!/usr/bin/env bash
#
# bootstrap-wsl.sh — provision a fresh WSL (Ubuntu) instance for developing
# the Orthodox Saints / "Cloud of Witnesses" repo.
#
# What it does (all idempotent — safe to re-run):
#   1. Grants the invoking user passwordless sudo.
#   2. Installs system build tools (make, build-essential, git, curl, unzip).
#   3. Installs uv and a uv-managed Python (3.14, matching CI).
#   4. Installs fnm and Node 24 (matching CI), set as the default.
#   5. Installs Claude Code (native installer).
#   6. Installs the GitHub CLI (gh) and Docker Engine + Compose, and adds you
#      to the `docker` group.
#   7. Clones the repo over HTTPS (or reuses the clone you run this from),
#      sets git core.autocrlf=false, creates a uv .venv with the Python deps,
#      runs `npm ci`, and installs the Playwright chromium browser.
#   8. Wires uv + fnm into ~/.bashrc so new shells "just work".
#   9. (Optional) Runs the fast CI gates to verify the setup.
#
# Usage — on a brand-new WSL instance, as your normal (non-root) user:
#
#     curl -fsSL https://raw.githubusercontent.com/SimplyThomas/orthodox-saints/main/scripts/bootstrap-wsl.sh | bash
#
#   or, if you already have the repo cloned:
#
#     ./scripts/bootstrap-wsl.sh
#
# Tunables (override via environment):
#     REPO_URL=https://github.com/SimplyThomas/orthodox-saints.git
#     REPO_DIR=$HOME/orthodox-saints     # where to clone if not already inside a clone
#     PYTHON_VERSION=3.14                 # uv-managed Python (CI uses 3.14)
#     NODE_MAJOR=24                       # fnm-managed Node   (CI uses 24)
#     SKIP_DOCKER=0                       # set 1 to skip Docker install
#     SKIP_PLAYWRIGHT=0                   # set 1 to skip Playwright browser download
#     SKIP_VERIFY=0                       # set 1 to skip the post-install CI gates
#
set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/SimplyThomas/orthodox-saints.git}"
REPO_DIR="${REPO_DIR:-$HOME/orthodox-saints}"
PYTHON_VERSION="${PYTHON_VERSION:-3.14}"
NODE_MAJOR="${NODE_MAJOR:-24}"
SKIP_DOCKER="${SKIP_DOCKER:-0}"
SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

LOCAL_BIN="$HOME/.local/bin"
FNM_DIR="$HOME/.local/share/fnm"

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m    WARN: %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ----------------------------------------------------------------------------
# Preflight
# ----------------------------------------------------------------------------
[ "$(id -u)" -ne 0 ] || die "Run this as your normal dev user, not root (it uses sudo where needed)."
have apt-get || die "This script targets Ubuntu/Debian WSL (apt-get not found)."

TARGET_USER="$(id -un)"
log "Bootstrapping WSL dev environment for user: $TARGET_USER"

# ----------------------------------------------------------------------------
# 1. Passwordless sudo for the current user
# ----------------------------------------------------------------------------
log "Configuring passwordless sudo for $TARGET_USER"
SUDOERS_FILE="/etc/sudoers.d/90-${TARGET_USER}-nopasswd"
if sudo test -f "$SUDOERS_FILE" && sudo grep -q "NOPASSWD:ALL" "$SUDOERS_FILE" 2>/dev/null; then
  info "Passwordless sudo already configured."
else
  # This is the one step that may prompt for your password.
  echo "${TARGET_USER} ALL=(ALL) NOPASSWD:ALL" | sudo tee "$SUDOERS_FILE" >/dev/null
  sudo chmod 0440 "$SUDOERS_FILE"
  sudo visudo -cf "$SUDOERS_FILE" >/dev/null || { sudo rm -f "$SUDOERS_FILE"; die "Invalid sudoers file; reverted."; }
  info "Wrote $SUDOERS_FILE"
fi

# ----------------------------------------------------------------------------
# 2. System packages
# ----------------------------------------------------------------------------
log "Installing system build tools (apt)"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y build-essential ca-certificates curl unzip git

# ----------------------------------------------------------------------------
# 3. uv + Python
# ----------------------------------------------------------------------------
export PATH="$LOCAL_BIN:$PATH"
if have uv; then
  log "uv already installed ($(uv --version))"
else
  log "Installing uv"
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
hash -r
log "Installing uv-managed Python $PYTHON_VERSION"
uv python install "$PYTHON_VERSION"

# ----------------------------------------------------------------------------
# 4. fnm + Node
# ----------------------------------------------------------------------------
export PATH="$FNM_DIR:$PATH"
if have fnm; then
  log "fnm already installed ($(fnm --version))"
else
  log "Installing fnm"
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
fi
hash -r
log "Installing Node $NODE_MAJOR via fnm"
eval "$(fnm env --shell bash)"
fnm install "$NODE_MAJOR"
fnm default "$NODE_MAJOR"
fnm use "$NODE_MAJOR"
info "node $(node --version) / npm $(npm --version)"

# ----------------------------------------------------------------------------
# 5. Claude Code
# ----------------------------------------------------------------------------
if have claude; then
  log "Claude Code already installed ($(claude --version 2>/dev/null || echo present))"
else
  log "Installing Claude Code"
  curl -fsSL https://claude.ai/install.sh | bash
fi

# ----------------------------------------------------------------------------
# 6a. GitHub CLI (gh)
# ----------------------------------------------------------------------------
if have gh; then
  log "GitHub CLI already installed ($(gh --version | head -1))"
else
  log "Installing GitHub CLI (gh)"
  sudo mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y gh
  info "Run 'gh auth login' once to enable PR creation (git push uses your SSH key)."
fi

# ----------------------------------------------------------------------------
# 6b. Docker
# ----------------------------------------------------------------------------
if [ "$SKIP_DOCKER" = "1" ]; then
  log "Skipping Docker (SKIP_DOCKER=1)"
elif have docker; then
  log "Docker already installed ($(docker --version))"
  sudo usermod -aG docker "$TARGET_USER"
else
  log "Installing Docker Engine"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  sudo usermod -aG docker "$TARGET_USER"
  info "Added $TARGET_USER to the 'docker' group (effective in a new shell)."
fi

# ----------------------------------------------------------------------------
# 7. Persist uv + fnm into ~/.bashrc
# ----------------------------------------------------------------------------
log "Wiring uv + fnm into ~/.bashrc"
BASHRC="$HOME/.bashrc"
MARKER="# --- orthodox-saints dev tooling (bootstrap-wsl.sh) ---"
if grep -qF "$MARKER" "$BASHRC" 2>/dev/null; then
  info "~/.bashrc block already present."
else
  cat >> "$BASHRC" <<EOF

$MARKER
export PATH="\$HOME/.local/bin:\$PATH"
export PATH="\$HOME/.local/share/fnm:\$PATH"
eval "\$(fnm env --use-on-cd --shell bash)"
EOF
  info "Appended dev-tooling block to ~/.bashrc"
fi

# ----------------------------------------------------------------------------
# 8. Clone / locate the repo and set it up
# ----------------------------------------------------------------------------
# Detect whether we're already running inside a clone.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/../build.py" ] && [ -f "$SCRIPT_DIR/../CLAUDE.md" ]; then
  REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  log "Using existing clone at $REPO_DIR"
elif [ -d "$REPO_DIR/.git" ]; then
  log "Repo already cloned at $REPO_DIR"
else
  log "Cloning repo into $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"

log "Configuring git for this repo (CRLF-safe per CLAUDE.md §7)"
git config core.autocrlf false

log "Creating uv .venv and installing Python deps"
uv venv --python "$PYTHON_VERSION" .venv
# openpyxl from requirements.txt + the authoring-only python-dotenv (see CLAUDE.md §4)
uv pip install --python .venv -r requirements.txt python-dotenv

log "Installing frontend deps (npm ci)"
npm ci

if [ "$SKIP_PLAYWRIGHT" = "1" ]; then
  log "Skipping Playwright browser (SKIP_PLAYWRIGHT=1)"
else
  log "Installing Playwright chromium + system deps"
  npx --yes playwright install --with-deps chromium
fi

# ----------------------------------------------------------------------------
# 9. Verify (fast CI gates)
# ----------------------------------------------------------------------------
if [ "$SKIP_VERIFY" = "1" ]; then
  log "Skipping verification (SKIP_VERIFY=1)"
else
  log "Verifying — running the fast CI gates"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  make validate
  make test
  make web-unit
  make web-lint
  info "Core gates passed. (For the full suite also run: make web-build && make web-test)"
fi

# ----------------------------------------------------------------------------
# Done
# ----------------------------------------------------------------------------
log "Bootstrap complete 🎉"
cat <<EOF

  Repo:    $REPO_DIR
  Python:  uv-managed $PYTHON_VERSION  (repo .venv)
  Node:    fnm-managed v$NODE_MAJOR

  Next steps:
    • Open a NEW shell (or: exec bash) so uv, fnm, Node, Claude Code, and your
      'docker' group membership are all active.
    • cd $REPO_DIR && source .venv/bin/activate
    • make serve      # live Astro dev server
    • make validate   # after data edits

  Note: pushing uses the SSH remote (git@github.com:...). On a fresh box, add an
  SSH key to GitHub first, or switch the remote to HTTPS + a token.
EOF

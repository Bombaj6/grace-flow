#!/bin/bash
# ==============================================================================
# Grace Flow — 1-Click macOS Installer
# ==============================================================================

cd "$(dirname "$0")"

echo "=========================================================="
echo "  🕊️  Installing Grace Flow to macOS Applications..."
echo "=========================================================="

# Build application bundle if not yet built
if [ ! -d "dist/Grace Flow.app" ]; then
  echo "Building desktop application bundle..."
  bash scripts/build-app.sh
fi

echo "--> Copying 'Grace Flow.app' to /Applications..."
cp -R "dist/Grace Flow.app" "/Applications/"
xattr -cr "/Applications/Grace Flow.app" 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  🎉 Grace Flow has been installed successfully!"
echo "  📍 Location: /Applications/Grace Flow.app"
echo "  💡 You can launch it anytime via Spotlight (Cmd + Space)"
echo "     or from your Applications folder."
echo "=========================================================="
echo ""

# Launch the newly installed application
open "/Applications/Grace Flow.app"

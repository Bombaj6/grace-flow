#!/bin/bash
set -e

# ==============================================================================
# Grace Flow — macOS Native App & DMG Installer Builder
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_NAME="Grace Flow"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
DMG_NAME="Grace Flow Installer.dmg"
DMG_PATH="$DIST_DIR/$DMG_NAME"
TEMP_DMG_DIR="$DIST_DIR/dmg_staging"

echo "=========================================================="
echo "  🕊️  Building $APP_NAME Native App & DMG Installer..."
echo "=========================================================="

# Clean previous build artifacts
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources/app"

# 1. Copy Application Code into Resources/app
echo "--> Bundling server, assets, and UI..."
cp "$ROOT_DIR/server.js" "$APP_BUNDLE/Contents/Resources/app/"
cp "$ROOT_DIR/package.json" "$APP_BUNDLE/Contents/Resources/app/"
cp -R "$ROOT_DIR/public" "$APP_BUNDLE/Contents/Resources/app/"
cp -R "$ROOT_DIR/data" "$APP_BUNDLE/Contents/Resources/app/"

# 2. Copy App Icon
if [ -f "$ROOT_DIR/public/assets/AppIcon.icns" ]; then
  cp "$ROOT_DIR/public/assets/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/"
fi

# 3. Create Info.plist
cat <<EOF > "$APP_BUNDLE/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Grace Flow</string>
    <key>CFBundleDisplayName</key>
    <string>Grace Flow</string>
    <key>CFBundleIdentifier</key>
    <string>com.graceflow.app</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>Grace Flow</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "APPL????" > "$APP_BUNDLE/Contents/PkgInfo"

# 4. Create MacOS Executable launcher
cat <<'EOF' > "$APP_BUNDLE/Contents/MacOS/Grace Flow"
#!/bin/bash
BUNDLE_DIR="$(cd "$(dirname "$0")/../Resources/app" && pwd)"
cd "$BUNDLE_DIR"

# Locate Node.js on user's system
NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "/usr/local/bin/node" ]; then
  NODE_BIN="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  NODE_BIN="/opt/homebrew/bin/node"
elif [ -x "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin/node" ]; then
  NODE_BIN="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin/node"
fi

if [ -z "$NODE_BIN" ]; then
  osascript -e 'display alert "Node.js Required" message "Grace Flow requires Node.js to be installed on your Mac. Please install Node.js from https://nodejs.org and reopen Grace Flow."'
  exit 1
fi

# Pick an open port (default 3000)
PORT=3000
export PORT

# Check if port 3000 is in use
if lsof -i :$PORT >/dev/null 2>&1; then
  # Grace Flow might already be running or port taken
  echo "Port $PORT is active, using it..."
else
  # Launch Grace Flow server in background
  "$NODE_BIN" server.js > "$HOME/.grace_flow.log" 2>&1 &
  SERVER_PID=$!
  sleep 1.2
fi

TARGET_URL="http://localhost:$PORT"

# Try opening in clean standalone app window (Chrome, Edge, Brave, or Safari)
if [ -d "/Applications/Google Chrome.app" ]; then
  open -n -a "Google Chrome" --args --app="$TARGET_URL"
elif [ -d "$HOME/Applications/Google Chrome.app" ]; then
  open -n -a "$HOME/Applications/Google Chrome.app" --args --app="$TARGET_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -n -a "Microsoft Edge" --args --app="$TARGET_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -n -a "Brave Browser" --args --app="$TARGET_URL"
else
  open "$TARGET_URL"
fi

EOF

chmod +x "$APP_BUNDLE/Contents/MacOS/Grace Flow"

echo "✓ Grace Flow.app built successfully at: $APP_BUNDLE"

# 5. Build the DMG Installer
echo "--> Creating DMG staging folder..."
mkdir -p "$TEMP_DMG_DIR"
cp -R "$APP_BUNDLE" "$TEMP_DMG_DIR/"

# Symlink to /Applications for standard drag-to-install
ln -s /Applications "$TEMP_DMG_DIR/Applications"

# Add friendly install instructions
cat <<EOF > "$TEMP_DMG_DIR/HOW TO INSTALL.txt"
==============================================================
   🕊️  WELCOME TO GRACE FLOW INSTALLER (v1.0)
==============================================================

To install Grace Flow:
1. Drag the "Grace Flow" app icon into the "Applications" folder.
2. Open your Applications folder (or press Cmd + Space and type "Grace Flow").
3. Click "Grace Flow" to start your church countdown deck!

Enjoy your seamless church production!
==============================================================
EOF

echo "--> Generating compressed disk image installer ($DMG_NAME)..."
hdiutil create -volname "Grace Flow Installer" \
  -srcfolder "$TEMP_DMG_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

# Cleanup staging
rm -rf "$TEMP_DMG_DIR"

echo "=========================================================="
echo "  🎉 SUCCESS! Standalone installer generated:"
echo "  📁 App Bundle: $APP_BUNDLE"
echo "  💿 DMG Installer: $DMG_PATH"
echo "=========================================================="

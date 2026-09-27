#!/bin/bash
set -e

# ==============================================================================
# Grace Flow — macOS Native App & Installer Builder
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_NAME="Grace Flow"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
ZIP_NAME="Grace-Flow-macOS.zip"
DMG_NAME="Grace-Flow-Installer.dmg"

echo "=========================================================="
echo "  🕊️  Building $APP_NAME Standalone Desktop App..."
echo "=========================================================="

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources/app"

echo "--> 1. Bundling server, assets, templates and UI..."
cp "$ROOT_DIR/server.js" "$APP_BUNDLE/Contents/Resources/app/"
cp "$ROOT_DIR/package.json" "$APP_BUNDLE/Contents/Resources/app/"
cp -R "$ROOT_DIR/public" "$APP_BUNDLE/Contents/Resources/app/"
cp -R "$ROOT_DIR/data" "$APP_BUNDLE/Contents/Resources/app/"

# Copy icon if available
if [ -f "$ROOT_DIR/public/assets/AppIcon.icns" ]; then
  echo "--> 2. Embedding high-res macOS AppIcon.icns..."
  cp "$ROOT_DIR/public/assets/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/"
fi

# Info.plist
echo "--> 3. Writing Info.plist configuration..."
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

# Executable launcher
echo "--> 4. Creating native desktop launcher executable..."
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
  osascript -e 'display alert "Node.js Required" message "Grace Flow requires Node.js. Please install Node.js from https://nodejs.org to use Grace Flow."'
  exit 1
fi

PORT=3000
export PORT

# Check if port 3000 is already active
if ! lsof -i :$PORT >/dev/null 2>&1; then
  "$NODE_BIN" server.js > "$HOME/.grace_flow.log" 2>&1 &
  sleep 1.2
fi

TARGET_URL="http://localhost:$PORT"

# Open in dedicated standalone app-window mode (no browser address bar/tabs)
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

echo "--> 5. Packaging into distributable zip installer..."
ditto -c -k --sequesterRsrc --keepParent "$APP_BUNDLE" "$DIST_DIR/$ZIP_NAME"

echo "=========================================================="
echo "  🎉 SUCCESS! Desktop app created:"
echo "  📁 App Bundle: $APP_BUNDLE"
echo "  📦 Zip Distribution: $DIST_DIR/$ZIP_NAME"
echo "=========================================================="

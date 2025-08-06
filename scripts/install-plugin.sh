#!/bin/bash

# Mac installation script for Avid Panel SDK plugin

PLUGIN_DIR="../plugin"
INSTALL_DIR="/Library/Application Support/Avid/PanelSDKPlugins"

echo "🎬 Installing Avid Panel SDK Plugin..."

# Create plugin directory if it doesn't exist
sudo mkdir -p "$INSTALL_DIR"

# Remove old version if exists
if [ -f "$INSTALL_DIR/panel-sdk-dev.avpi" ]; then
    echo "Removing old version..."
    sudo rm "$INSTALL_DIR/panel-sdk-dev.avpi"
fi

# Create .avpi file
cd "$PLUGIN_DIR"
zip -r panel-sdk-dev.avpi avid-manifest.json static/

# Move to installation directory
sudo mv panel-sdk-dev.avpi "$INSTALL_DIR/"

echo "✅ Plugin installed successfully!"
echo "📍 Location: $INSTALL_DIR/panel-sdk-dev.avpi"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Restart Media Composer"
echo "3. Open Tools > Panel SDK Development"
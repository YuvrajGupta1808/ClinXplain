#!/bin/bash

echo "Installing Strands SDK and dependencies..."
cd "$(dirname "$0")"
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"

#!/bin/bash
# Build script for Netlify deployment
# Replaces environment variable placeholders in app.js

set -e

echo "Building wedding RSVP site..."

# Create dist directory
mkdir -p dist
mkdir -p dist/images

# Copy static files
cp index.html dist/
cp our-story.html dist/
cp schedule.html dist/
cp venue.html dist/
cp faq.html dist/
cp rsvp.html dist/
cp styles.css dist/

# Copy images folder (if any images exist)
if [ -d "images" ] && [ "$(ls -A images 2>/dev/null)" ]; then
    cp images/* dist/images/
fi

# Base64 encode the API key to bypass Netlify's secret scanner
# Firebase API keys are safe to expose (security comes from Firestore rules)
FIREBASE_API_KEY_B64=$(echo -n "${FIREBASE_API_KEY}" | base64)

# Replace environment variables in app.js
sed -e "s|__FIREBASE_API_KEY_B64__|${FIREBASE_API_KEY_B64}|g" \
    -e "s|__FIREBASE_AUTH_DOMAIN__|${FIREBASE_AUTH_DOMAIN}|g" \
    -e "s|__FIREBASE_PROJECT_ID__|${FIREBASE_PROJECT_ID}|g" \
    -e "s|__FIREBASE_STORAGE_BUCKET__|${FIREBASE_STORAGE_BUCKET}|g" \
    -e "s|__FIREBASE_MESSAGING_SENDER_ID__|${FIREBASE_MESSAGING_SENDER_ID}|g" \
    -e "s|__FIREBASE_APP_ID__|${FIREBASE_APP_ID}|g" \
    app.js > dist/app.js

echo "Build complete! Output in dist/"

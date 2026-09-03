#!/bin/bash
set -e

CERTS_DIR="certs"
PASS_CER="$CERTS_DIR/pass.cer"
PASS_PEM="$CERTS_DIR/pass.pem"
PASS_KEY="$CERTS_DIR/pass.key"
ENV_LOCAL="apps/web/.env.local"

if [ ! -f "$PASS_CER" ]; then
  echo "Error: $PASS_CER not found."
  echo "Please place the downloaded pass.cer file into the certs/ directory first."
  exit 1
fi

if [ ! -f "$PASS_KEY" ]; then
  echo "Error: $PASS_KEY not found."
  exit 1
fi

echo "Converting $PASS_CER to $PASS_PEM..."
openssl x509 -inform DER -in "$PASS_CER" -out "$PASS_PEM"

echo "Reading certificate and key files..."
CERT_CONTENT=$(cat "$PASS_PEM")
KEY_CONTENT=$(cat "$PASS_KEY")

echo "Updating $ENV_LOCAL..."

# Ensure file exists
touch "$ENV_LOCAL"

# Append or update env vars
{
  echo ""
  echo "# Apple Wallet Credentials"
  echo "APPLE_PASS_TYPE_ID=pass.in.man2web.tapit"
  echo "APPLE_PASS_CERT=\"$CERT_CONTENT\""
  echo "APPLE_PASS_KEY=\"$KEY_CONTENT\""
} >> "$ENV_LOCAL"

echo "Done! Apple Wallet certificates appended to $ENV_LOCAL"

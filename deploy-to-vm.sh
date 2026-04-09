#!/usr/bin/env bash
# Run this from your Mac to push Pose-Corrector-App to IBM Linux One VM.
# Usage: ./deploy-to-vm.sh

set -e
KEY="/Users/vamshikrishnanalla/Downloads/VirtualServerkey.pem"
USER="linux1"
HOST="148.100.112.215"
REMOTE_DIR="~/Pose-Corrector-App"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY"
  exit 1
fi

echo "Pushing to ${USER}@${HOST}:${REMOTE_DIR} ..."
rsync -avz --progress \
  -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/build' \
  --exclude 'backend/venv' \
  --exclude 'backend/__pycache__' \
  --exclude 'backend/*/__pycache__' \
  --exclude '*.pyc' \
  --exclude 'backend/db.sqlite3' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude 'frontend/.env' \
  --exclude 'backend/.env' \
  "$LOCAL_DIR/" "${USER}@${HOST}:${REMOTE_DIR}/"

echo "Done. SSH into VM and run: cd Pose-Corrector-App && bash vm-setup.sh"
echo "  ssh -i $KEY ${USER}@${HOST}"

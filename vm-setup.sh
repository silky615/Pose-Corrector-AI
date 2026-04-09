#!/usr/bin/env bash
# Run this ON the VM (after deploy-to-vm.sh has pushed the project).
# Usage: cd ~/Pose-Corrector-App && bash vm-setup.sh

set -e
cd "$(dirname "$0")"
VM_IP="${VM_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"

echo "=== Pose-Corrector-App VM setup ==="

# Python backend
echo "--- Backend ---"
if ! command -v python3 &>/dev/null; then
  echo "Install Python 3.8+ (e.g. sudo yum install python3 python3-pip)"
  exit 1
fi
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput 2>/dev/null || true
deactivate
cd ..

# Node frontend (optional: build so you can serve static)
echo "--- Frontend ---"
if command -v node &>/dev/null && command -v npm &>/dev/null; then
  cd frontend
  npm install
  # Point API to this server's IP so browser can call backend
  if [[ -n "$VM_IP" ]]; then
    echo "REACT_APP_API_URL=http://${VM_IP}:8000" > .env
  else
    [[ -f .env.example ]] && cp .env.example .env || true
  fi
  npm run build
  cd ..
else
  echo "Node/npm not found. Install Node 18+ to build frontend, or serve backend only."
fi

echo ""
echo "=== Run (choose one) ==="
echo ""
echo "1) Backend only (API on port 8000):"
echo "   cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000"
echo ""
echo "2) Frontend dev server (after backend is running):"
echo "   cd frontend && npm start"
echo "   Then set REACT_APP_API_URL=http://$(hostname -I 2>/dev/null | awk '{print $1}'):8000"
echo ""
echo "3) Production-style: run backend with gunicorn and serve frontend build with a static server."
echo "   Backend: cd backend && source venv/bin/activate && gunicorn exercise_correction.wsgi:application -b 0.0.0.0:8000"
echo "   Frontend: serve the frontend/build folder (e.g. nginx or: npx serve -s frontend/build -l 3000)"
echo ""
echo "Allow port 8000 (and 3000 if using npm start) in firewall if needed:"
echo "   sudo firewall-cmd --permanent --add-port=8000/tcp  # RHEL/CentOS"
echo "   sudo firewall-cmd --reload"
echo ""

#!/usr/bin/env bash
# Запуск на VPS из каталога проекта: bash deploy/check-prod-api.sh
set -euo pipefail

ROOT="${1:-/opt/rassel_shop}"
cd "$ROOT"

echo "=== Docker compose (статус) ==="
docker compose --env-file .env.server -f docker-compose.server.yml ps

echo ""
echo "=== Backend: health на хосте (nginx → :8000) ==="
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8000/health || echo "FAIL: backend не отвечает на 127.0.0.1:8000"

echo ""
echo "=== Backend: ready (БД) ==="
curl -fsS http://127.0.0.1:8000/health/ready || echo "FAIL: /health/ready"

echo ""
echo "=== API: публичные настройки ==="
curl -fsS http://127.0.0.1:8000/api/public/settings | head -c 400
echo ""

echo ""
echo "=== Через nginx /api (если nginx настроен) ==="
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" https://tele-makc.ru/api/public/settings 2>/dev/null \
  || curl -fsS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1/api/public/settings 2>/dev/null \
  || echo "Проверьте вручную: curl -I https://ВАШ_ДОМЕН/api/public/settings"

echo ""
echo "=== Frontend: env API_URL_INTERNAL ==="
docker compose --env-file .env.server -f docker-compose.server.yml exec -T frontend sh -c 'echo "API_URL_INTERNAL=$API_URL_INTERNAL"; echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"' 2>/dev/null \
  || echo "Контейнер frontend не запущен"

echo ""
echo "=== Frontend → backend из сети Docker ==="
docker compose --env-file .env.server -f docker-compose.server.yml exec -T frontend wget -q -O - http://backend:8000/api/public/settings 2>/dev/null | head -c 400 \
  || echo "FAIL: frontend не достучался до backend:8000"

echo ""
echo "=== Последние логи backend (50 строк) ==="
docker compose --env-file .env.server -f docker-compose.server.yml logs --tail=50 backend

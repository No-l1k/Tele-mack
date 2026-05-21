# API не работает на проде — куда смотреть

Цепочка запросов:

```text
Браузер  →  https://сайт/api/...     →  nginx :443  →  127.0.0.1:8000  →  backend (FastAPI)
SSR Next →  http://backend:8000/api/  →  напрямую в Docker-сеть (минуя nginx)
```

Если «в консоли пусто» — откройте **Network** (Сеть) в DevTools и фильтр `api`. Ошибки сети и 502 часто не попадают в Console.

## 1. Контейнеры живы?

```bash
cd /opt/rassel_shop
docker compose --env-file .env.server -f docker-compose.server.yml ps
```

- `backend` должен быть **Up (healthy)**.
- Если **Restarting** или **unhealthy** — смотрите логи (п. 4).

Быстрая проверка:

```bash
bash deploy/check-prod-api.sh
```

## 2. Backend отвечает на сервере?

```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:8000/health/ready
curl -s http://127.0.0.1:8000/api/public/settings | head
```

| Результат | Значение |
|-----------|----------|
| connection refused | контейнер backend не слушает :8000 |
| 503 на `/health/ready` | PostgreSQL недоступна или миграции не прошли |
| 400 Invalid host | `TRUSTED_HOSTS` в `.env.server` не совпадает с доменом в браузере |
| JSON с `data` | API на хосте работает → смотрите nginx (п. 3) |

## 3. Nginx проксирует `/api`?

Конфиг: `deploy/nginx/tele-makc.conf` → `/etc/nginx/sites-enabled/`.

```bash
curl -I https://tele-makc.ru/api/public/settings
# ожидается HTTP/2 200 (не 502, не 404 HTML от Next)
```

502 Bad Gateway — nginx не достучался до `127.0.0.1:8000` (backend упал).

404 от Next (HTML) — запрос попал на **frontend :3000**, а не на backend: в nginx нет `location /api` или не тот `server_name`.

## 4. Логи backend

```bash
docker compose --env-file .env.server -f docker-compose.server.yml logs --tail=100 backend
```

Частые причины падения при старте:

- нет или слабый `SECRET_KEY` / `ADMIN_PASSWORD` (production validation);
- ошибка `alembic upgrade head` (БД);
- не заданы переменные из `docker-compose.server.yml` (`SMTP_*`, `POSTGRES_*` и т.д.).

## 5. SSR (каталог пустой, в браузере /api ок)

У контейнера **frontend** должно быть:

```bash
docker compose ... exec frontend sh -c 'echo $API_URL_INTERNAL'
# ожидается: http://backend:8000/api
```

Если пусто или `127.0.0.1:8000` — пересоздайте контейнер (не только образ):

```bash
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build --force-recreate frontend
```

После обновления Dockerfile (multi-stage) в образе **не** должен оставаться `API_URL_INTERNAL=127.0.0.1` — только значение из compose.

Проверка из frontend:

```bash
docker compose ... exec frontend wget -q -O - http://backend:8000/api/public/settings
```

## 6. CORS (только браузер)

В `.env.server`:

```env
CORS_ORIGINS=https://tele-makc.ru,https://www.tele-makc.ru
```

Домен в адресной строке должен совпадать (с `www` или без — как открыли сайт).

## 7. Деплой после правок

```bash
cd /opt/rassel_shop
git pull
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build --force-recreate
sudo nginx -t && sudo systemctl reload nginx
```

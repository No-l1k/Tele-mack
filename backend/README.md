# Tele-makc Backend (FastAPI)

Бэкенд для интернет-магазина и админки продавца/владельца сайта.

## Что уже реализовано

- JWT авторизация для админа: `POST /api/auth/admin/login`
- Роли и защита админских роутов
- Товары: список, карточка, create/update/delete
- Категории: список, create/update/delete
- Заказы: создание, список для админа, смена статуса/оплаты, базовая статистика
- Пользователи: список (admin), профиль текущего пользователя
- Корзина: получить, добавить товар, удалить товар
- Админка: `stats`, `analytics` (заготовка), `settings`
- Импорт YML/XML каталога товаров: `POST /api/admin/import/yml` (только admin)

## Запуск

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Проверка:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/health/ready`
- `GET http://localhost:8000/docs`

Тесты:

```bash
pytest
```

## Production запуск (PostgreSQL + Docker)

1. Создай `.env` из примера:

```bash
cp .env.example .env
```

2. Подними БД и backend:

```bash
docker compose up --build
```

При старте автоматически выполняется:
- `alembic upgrade head`
- запуск API на `http://localhost:8000`

## Миграции (Alembic)

```bash
# применить миграции
alembic upgrade head

# откатить последнюю миграцию
alembic downgrade -1

# создать новую миграцию (после изменений моделей)
alembic revision --autogenerate -m "your message"
```

## Подключение фронта

В фронте укажи:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Импорт XML/YML товаров

1. Получи admin токен через `POST /api/auth/admin/login`.
2. Отправь файл каталога:

```bash
curl -X POST "http://localhost:8000/api/admin/import/yml" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "file=@/path/to/60159.xml"
```

Импорт делает upsert:
- категории по slug вида `<name>-<externalCategoryId>`
- товары по slug вида `<name>-<externalOfferId>`

Импорт напрямую из URL:

```bash
python scripts/import_yml_from_url.py --url "https://www.tele-makc.ru/marketplace/60159.xml"
```

Локальный seed (для пустой БД, чтобы API-режим фронта не был пустым):

```bash
python scripts/seed_demo_data.py
```

## Production Security Minimum

Set these env vars for production:

```env
ENVIRONMENT=production
DB_AUTO_CREATE=false
ALLOW_DEV_AUTH_CODES=false
ALLOW_ADMIN_BOOTSTRAP=false
EXPOSE_DOCS=false
```

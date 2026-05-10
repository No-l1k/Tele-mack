# TeleMakc API Documentation

## Base URL
```
http://your-backend.com/api
```

## Authentication
API использует JWT токены. Добавляйте заголовок:
```
Authorization: Bearer <token>
```

---

## Products API

### GET /products
Получить список товаров с фильтрацией и пагинацией.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Slug категории |
| min_price | number | Минимальная цена |
| max_price | number | Максимальная цена |
| brands | string | Бренды через запятую |
| in_stock | boolean | Только в наличии |
| is_new | boolean | Только новинки |
| search | string | Поисковый запрос |
| sort | string | Сортировка: price-asc, price-desc, rating, newest, popular |
| page | number | Номер страницы (default: 1) |
| page_size | number | Размер страницы (default: 20) |

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "Телевизор Samsung QE98QN990F",
      "slug": "samsung-qe98qn990f",
      "description": "...",
      "price": 1620000,
      "oldPrice": 1980000,
      "images": ["url1", "url2"],
      "categoryId": "cat1",
      "categorySlug": "televizory",
      "brand": "Samsung",
      "specs": { "Диагональ": "98\"", "Разрешение": "8K" },
      "inStock": true,
      "quantity": 5,
      "rating": 4.8,
      "reviewsCount": 12,
      "isNew": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

### GET /products/:id
Получить товар по ID.

### GET /products/slug/:slug
Получить товар по slug.

### POST /products (Admin)
Создать новый товар.

**Request Body:**
```json
{
  "name": "Телевизор Samsung ...",
  "slug": "samsung-...",
  "description": "Описание товара",
  "shortDescription": "Краткое описание",
  "price": 1620000,
  "oldPrice": 1980000,
  "images": ["url1", "url2"],
  "categoryId": "cat1",
  "categorySlug": "televizory",
  "brand": "Samsung",
  "specs": { "Диагональ": "98\"" },
  "inStock": true,
  "quantity": 5,
  "isNew": true
}
```

### PUT /products/:id (Admin)
Обновить товар.

### DELETE /products/:id (Admin)
Удалить товар.

### POST /products/:id/images (Admin)
Загрузить изображения. Multipart form-data с полем `images`.

### GET /products/search?q=query
Поиск товаров.

### GET /products/new?limit=10
Получить новинки.

### GET /products/popular?limit=10
Получить популярные товары.

### GET /products/:id/related?limit=4
Получить похожие товары.

---

## Categories API

### GET /categories
Получить все категории.

**Response:**
```json
{
  "data": [
    {
      "id": "cat1",
      "name": "Телевизоры",
      "slug": "televizory",
      "image": "https://...",
      "description": "Телевизоры всех брендов",
      "productCount": 45,
      "order": 1
    }
  ],
  "success": true
}
```

### GET /categories/:id
### GET /categories/slug/:slug
### POST /categories (Admin)
### PUT /categories/:id (Admin)
### DELETE /categories/:id (Admin)

---

## Orders API

### GET /orders
Получить заказы. Для админа - все, для пользователя - только свои.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, confirmed, processing, shipped, delivered, cancelled |
| page | number | Номер страницы |
| page_size | number | Размер страницы |
| user_id | string | ID пользователя (admin only) |

**Response:**
```json
{
  "data": [
    {
      "id": "ord1",
      "number": 5769,
      "status": "confirmed",
      "items": [
        {
          "productId": "1",
          "productName": "Телевизор Samsung...",
          "productImage": "https://...",
          "price": 1310000,
          "quantity": 1,
          "total": 1310000
        }
      ],
      "subtotal": 1310000,
      "deliveryCost": 0,
      "paymentSurcharge": 196500,
      "total": 1506500,
      "deliveryMethod": "courier",
      "paymentMethod": "card",
      "paymentStatus": "pending",
      "customer": {
        "name": "Иван Иванов",
        "phone": "+7(926)111-11-11",
        "email": "test@mail.ru"
      },
      "address": {
        "city": "Москва",
        "street": "ул. Примерная",
        "house": "10",
        "apartment": "25"
      },
      "comment": "Позвонить за час",
      "services": {
        "pixelCheck": true,
        "installation": false
      },
      "createdAt": "2025-04-19T13:12:00Z",
      "updatedAt": "2025-04-19T13:15:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

### GET /orders/:id
Получить заказ по ID.

### POST /orders
Создать заказ.

**Request Body:**
```json
{
  "items": [
    { "productId": "1", "quantity": 1 }
  ],
  "phone": "+7(926)111-11-11",
  "name": "Иван Иванов",
  "email": "test@mail.ru",
  "city": "Москва",
  "street": "ул. Примерная",
  "house": "10",
  "apartment": "25",
  "comment": "Позвонить за час",
  "deliveryMethod": "courier",
  "paymentMethod": "card",
  "pixelCheck": true,
  "installation": false,
  "becomeCustomer": true
}
```

**Response:**
```json
{
  "data": {
    "id": "ord1",
    "number": 5770,
    ...
  },
  "success": true
}
```

### PUT /orders/:id/status (Admin)
Обновить статус заказа.

**Request Body:**
```json
{
  "status": "shipped"
}
```

### PUT /orders/:id/payment (Admin)
Отметить заказ как оплаченный.

**Request Body:**
```json
{
  "paid": true
}
```

### GET /orders/stats?period=month (Admin)
Статистика по заказам.

### GET /orders/export (Admin)
Экспорт заказов в CSV.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Фильтр по статусу |
| from | string | Дата от (ISO) |
| to | string | Дата до (ISO) |

---

## Users API

### GET /users (Admin)
Получить всех пользователей.

### GET /users/:id (Admin)
### GET /users/me
Получить текущего пользователя.

### PUT /users/me
Обновить профиль.

### GET /users/me/orders
Получить заказы текущего пользователя.

### POST /users/me/favorites/:productId
Добавить товар в избранное.

### DELETE /users/me/favorites/:productId
Удалить из избранного.

### GET /users/me/favorites
Получить избранные товары.

---

## Auth API

### POST /auth/login
Запрос SMS кода.

**Request Body:**
```json
{
  "phone": "+7(926)111-11-11"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS код отправлен"
}
```

### POST /auth/verify
Подтверждение SMS кода.

**Request Body:**
```json
{
  "phone": "+7(926)111-11-11",
  "code": "1234"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user1",
      "phone": "+7(926)111-11-11",
      "name": "Иван Иванов",
      "role": "customer"
    }
  },
  "success": true
}
```

### POST /auth/register
Регистрация нового пользователя.

### POST /auth/logout
Выход.

### POST /auth/admin/login
Вход в админку (логин + пароль).

**Request Body:**
```json
{
  "login": "admin",
  "password": "secure_password"
}
```

---

## Reviews API

### GET /reviews (Admin)
Получить все отзывы.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| approved | boolean | Фильтр по статусу одобрения |
| product_id | string | Фильтр по товару |
| page | number | Номер страницы |

### GET /products/:id/reviews
Получить отзывы товара.

### POST /products/:id/reviews
Создать отзыв.

**Request Body:**
```json
{
  "rating": 5,
  "text": "Отличный телевизор!",
  "pros": "Качество картинки, звук",
  "cons": "Цена"
}
```

### PUT /reviews/:id/approve (Admin)
Одобрить отзыв.

### DELETE /reviews/:id (Admin)
Удалить отзыв.

---

## Dashboard API (Admin)

### GET /admin/stats
Статистика для дашборда.

**Response:**
```json
{
  "data": {
    "totalOrders": 156,
    "totalRevenue": 45670000,
    "pendingOrders": 12,
    "totalProducts": 89,
    "totalUsers": 234,
    "ordersToday": 5,
    "revenueToday": 3450000
  },
  "success": true
}
```

### GET /admin/analytics?period=month
Аналитика за период.

**Response:**
```json
{
  "data": {
    "revenue": [
      { "date": "2025-04-01", "amount": 1200000 },
      { "date": "2025-04-02", "amount": 890000 }
    ],
    "orders": [
      { "date": "2025-04-01", "count": 5 },
      { "date": "2025-04-02", "count": 3 }
    ],
    "topProducts": [
      { "product": {...}, "soldCount": 12 }
    ],
    "topCategories": [
      { "category": {...}, "revenue": 15000000 }
    ]
  },
  "success": true
}
```

---

## Settings API (Admin)

### GET /admin/settings
Получить настройки магазина.

**Response:**
```json
{
  "data": {
    "name": "TeleMakc",
    "phone": "+7(926)802-34-97",
    "email": "tele-makc@yandex.ru",
    "address": "Москва, ул. Примерная, 1",
    "workingHours": "Пн-Вс: 9:00-21:00",
    "deliveryInfo": {
      "moscowFree": true,
      "moscowMinSum": 1,
      "regionCostPerKm": 50,
      "deliveryDays": "1-3 дня"
    },
    "paymentMethods": {
      "cash": true,
      "card": true,
      "cardSurcharge": 15,
      "pickup": true
    },
    "social": {
      "whatsapp": "+79268023497",
      "telegram": "@telemakc"
    }
  },
  "success": true
}
```

### PUT /admin/settings
Обновить настройки магазина.

---

## Error Responses

Все ошибки возвращаются в формате:
```json
{
  "success": false,
  "message": "Описание ошибки"
}
```

**HTTP коды:**
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Нет доступа
- `404` - Не найдено
- `500` - Ошибка сервера

---

## Python Backend Example (FastAPI)

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()
security = HTTPBearer()

class Product(BaseModel):
    id: str
    name: str
    slug: str
    price: int
    # ... остальные поля

@app.get("/api/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    page: int = 1,
    page_size: int = 20
):
    # Ваша логика получения товаров из PostgreSQL
    pass

@app.post("/api/products")
async def create_product(
    product: Product,
    token: str = Depends(security)
):
    # Проверка что пользователь админ
    # Создание товара
    pass
```

---

## Database Schema (PostgreSQL)

```sql
-- Пользователи
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Категории
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image VARCHAR(500),
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INT DEFAULT 0
);

-- Товары
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price INT NOT NULL,
    old_price INT,
    category_id UUID REFERENCES categories(id),
    brand VARCHAR(255),
    specs JSONB,
    in_stock BOOLEAN DEFAULT true,
    quantity INT DEFAULT 0,
    is_new BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Изображения товаров
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0
);

-- Заказы
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number SERIAL,
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    subtotal INT NOT NULL,
    delivery_cost INT DEFAULT 0,
    payment_surcharge INT DEFAULT 0,
    total INT NOT NULL,
    delivery_method VARCHAR(20),
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending',
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    address_city VARCHAR(255),
    address_street VARCHAR(255),
    address_house VARCHAR(50),
    address_apartment VARCHAR(50),
    comment TEXT,
    pixel_check BOOLEAN DEFAULT false,
    installation BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Позиции заказа
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(500) NOT NULL,
    product_image VARCHAR(500),
    price INT NOT NULL,
    quantity INT NOT NULL,
    total INT NOT NULL
);

-- Отзывы
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    pros TEXT,
    cons TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Избранное
CREATE TABLE favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
);

-- Настройки магазина
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL
);

-- Индексы
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_reviews_product ON reviews(product_id);
```

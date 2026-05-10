from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    response = client.post("/api/auth/admin/login", json={"login": "admin", "password": "admin123"})
    assert response.status_code == 200
    token = response.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def _create_product(headers: dict[str, str]) -> int:
    suffix = uuid4().hex[:8]
    category_payload = {
        "name": f"Категория {suffix}",
        "slug": f"test-category-{suffix}",
        "order": 1,
    }
    category_response = client.post("/api/categories", headers=headers, json=category_payload)
    assert category_response.status_code == 200
    category_id = category_response.json()["data"]["id"]

    product_payload = {
        "name": f"Тестовый товар {suffix}",
        "slug": f"test-product-{suffix}",
        "description": "Описание тестового товара",
        "shortDescription": "Короткое описание",
        "price": 10000,
        "categoryId": category_id,
        "categorySlug": category_payload["slug"],
        "brand": "TestBrand",
        "specs": {"images": ["/images/placeholders/product.svg"]},
        "quantity": 5,
        "inStock": True,
        "isNew": False,
    }
    product_response = client.post("/api/products", headers=headers, json=product_payload)
    assert product_response.status_code == 200
    return int(product_response.json()["data"]["id"])


def test_admin_login_works():
    response = client.post("/api/auth/admin/login", json={"login": "admin", "password": "admin123"})
    assert response.status_code == 200
    assert response.json()["data"]["user"]["role"] == "admin"


def test_order_create_and_public_fetch():
    headers = _admin_headers()
    product_id = _create_product(headers)

    order_payload = {
        "items": [{"productId": product_id, "quantity": 1}],
        "phone": "+79000000001",
        "name": "Test Buyer",
        "deliveryMethod": "courier",
        "paymentMethod": "cash",
    }
    create_response = client.post("/api/orders", json=order_payload)
    assert create_response.status_code == 200
    order_data = create_response.json()["data"]
    order_id = order_data["id"]
    public_token = order_data["publicToken"]

    public_response = client.get(f"/api/orders/public/{order_id}?token={public_token}")
    assert public_response.status_code == 200
    assert public_response.json()["data"]["id"] == order_id


def test_products_export_requires_admin_and_returns_csv():
    unauthorized = client.get("/api/products/export")
    assert unauthorized.status_code == 401

    headers = _admin_headers()
    response = client.get("/api/products/export", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "name,price,category,stock,description,images" in response.text

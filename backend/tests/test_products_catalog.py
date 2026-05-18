"""Интеграционные тесты каталога: фильтры, пагинация, slug, бренд, GTIN, stockStatus, specs/images."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    response = client.post("/api/auth/admin/login", json={"login": "admin", "password": "admin123"})
    assert response.status_code == 200
    token = response.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def _create_category(headers: dict[str, str], *, name: str, slug: str, parent_id: int | None = None) -> int:
    payload = {"name": name, "slug": slug, "order": 1}
    if parent_id is not None:
        payload["parentId"] = parent_id
    response = client.post("/api/categories", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    return int(response.json()["data"]["id"])


def _create_product(
    headers: dict[str, str],
    *,
    category_id: int,
    category_slug: str,
    name: str,
    slug: str,
    brand: str = "Testbrand",
    specs: dict | None = None,
    stock_status: str = "in_stock",
    gtin: str | None = None,
    sku: str | None = None,
) -> dict:
    payload = {
        "name": name,
        "slug": slug,
        "description": "Полное описание",
        "shortDescription": "Кратко",
        "price": 1000,
        "categoryId": category_id,
        "categorySlug": category_slug,
        "brand": brand,
        "specs": specs if specs is not None else {"Цвет": "Чёрный"},
        "stockStatus": stock_status,
        "quantity": 3,
        "inStock": stock_status in {"in_stock", "low_stock"},
        "isNew": False,
        "rating": 4.8,
        "reviewsCount": 1,
    }
    if gtin is not None:
        payload["gtin"] = gtin
    if sku is not None:
        payload["sku"] = sku
    response = client.post("/api/products", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    return response.json()["data"]


def test_list_products_rejects_page_size_above_cap():
    """FastAPI валидирует Query: page_size > 100 даёт 422 (как на фронте при запросе 500)."""
    response = client.get("/api/products?page_size=101")
    assert response.status_code == 422


def test_category_filter_includes_subcategories_by_default():
    """Товар в подкатегории должен попадать в выдачу родительской категории."""
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    parent_slug = f"parent-cat-{suffix}"
    child_slug = f"child-cat-{suffix}"
    parent_id = _create_category(headers, name=f"Родитель {suffix}", slug=parent_slug)
    child_id = _create_category(
        headers, name=f"Родитель {suffix} / Дочерняя", slug=child_slug, parent_id=parent_id
    )
    product_slug = f"prod-sub-{suffix}"
    created = _create_product(
        headers,
        category_id=child_id,
        category_slug=child_slug,
        name=f"Товар в подкатегории {suffix}",
        slug=product_slug,
    )

    with_children = client.get(f"/api/products?category={parent_slug}&page_size=100")
    assert with_children.status_code == 200
    ids = {item["id"] for item in with_children.json()["data"]}
    assert created["id"] in ids

    without_children = client.get(
        f"/api/products?category={parent_slug}&include_subcategories=false&page_size=100"
    )
    assert without_children.status_code == 200
    ids_parent_only = {item["id"] for item in without_children.json()["data"]}
    assert created["id"] not in ids_parent_only


def test_get_product_by_slug():
    """Публичная карточка по slug: /products/slug/{slug}."""
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    slug = f"by-slug-{suffix}"
    cat_slug = f"cat-slug-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    created = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Slug товар {suffix}",
        slug=slug,
    )

    response = client.get(f"/api/products/slug/{slug}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == created["id"]
    assert response.json()["data"]["slug"] == slug


def test_numeric_slug_resolved_via_slug_endpoint():
    """Регрессия: slug из одних цифр отдаётся по /products/slug/{slug}, даже если совпадает с чужим id."""
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-num-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)

    for _ in range(5):
        numeric_slug = str(7_000_000 + (uuid4().int % 100_000))
        created = _create_product(
            headers,
            category_id=cat_id,
            category_slug=cat_slug,
            name=f"Numeric slug {suffix}",
            slug=numeric_slug,
        )
        if created["id"] == int(numeric_slug):
            continue
        by_wrong_id = client.get(f"/api/products/{numeric_slug}")
        assert by_wrong_id.status_code == 404
        by_slug = client.get(f"/api/products/slug/{numeric_slug}")
        assert by_slug.status_code == 200
        assert by_slug.json()["data"]["id"] == created["id"]
        return
    raise AssertionError("Could not allocate numeric slug distinct from product id")


def test_brand_normalized_on_create():
    """Бренд приводится к каноническому виду (например samsung -> Samsung)."""
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-brand-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    slug = f"brand-{suffix}"
    created = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Бренд тест {suffix}",
        slug=slug,
        brand="samsung",
    )
    assert created["brand"] == "Samsung"

    listed = client.get(f"/api/products?brands=Samsung&page_size=100")
    assert listed.status_code == 200
    ids = {item["id"] for item in listed.json()["data"]}
    assert created["id"] in ids


def test_gtin_validation():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-gtin-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    bad = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": "Bad GTIN",
            "slug": f"bad-gtin-{suffix}",
            "description": "d",
            "shortDescription": "s",
            "price": 1,
            "categoryId": cat_id,
            "categorySlug": cat_slug,
            "brand": "X",
            "specs": {},
            "stockStatus": "in_stock",
            "quantity": 1,
            "gtin": "123",
        },
    )
    assert bad.status_code == 400


def test_specs_payload_images_not_stored_in_specs_dict():
    """Ключ images в specs при создании не попадает в JSON specs (картинки — отдельное поле / загрузка)."""
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-spec-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    created = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Specs {suffix}",
        slug=f"specs-{suffix}",
        specs={"images": ["/fake.png"], "Диагональ": "55\""},
    )
    assert "images" not in created["specs"]
    assert created["specs"].get("Диагональ") == "55\""
    assert created["images"] == []


def test_stock_status_preorder_marks_not_in_stock():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-stock-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    created = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Preorder {suffix}",
        slug=f"pre-{suffix}",
        stock_status="preorder",
    )
    assert created["stockStatus"] == "preorder"
    assert created["inStock"] is False


def test_invalid_stock_status_rejected():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-badst-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    response = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": "Bad stock",
            "slug": f"bad-st-{suffix}",
            "description": "d",
            "shortDescription": "s",
            "price": 1,
            "categoryId": cat_id,
            "categorySlug": cat_slug,
            "brand": "X",
            "specs": {},
            "stockStatus": "unknown_status",
            "quantity": 1,
        },
    )
    assert response.status_code == 400


def test_recommended_accessory_ids_keep_only_existing_products():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-acc-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    accessory = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Accessory {suffix}",
        slug=f"acc-{suffix}",
    )

    response = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": f"Main with accessories {suffix}",
            "slug": f"main-acc-{suffix}",
            "description": "d",
            "shortDescription": "s",
            "price": 1000,
            "categoryId": cat_id,
            "categorySlug": cat_slug,
            "brand": "X",
            "specs": {},
            "stockStatus": "in_stock",
            "quantity": 1,
            "recommendedAccessoryIds": [accessory["id"], 9_999_999],
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["data"]["recommendedAccessoryIds"] == [accessory["id"]]


def test_search_cyrillic_case_insensitive():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-cyr-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    product = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Телевизор LG Test {suffix}",
        slug=f"tv-cyr-{suffix}",
    )

    response = client.get(
        "/api/products/search",
        params={"q": "телевизор", "page_size": 50},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert product["id"] in ids


def test_search_finds_by_brand_case_insensitive():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-search-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    product = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Unique Name XYZ {suffix}",
        slug=f"unique-{suffix}",
        brand="Sony",
    )

    response = client.get("/api/products/search", params={"q": "sony", "page_size": 50})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert product["id"] in ids


def test_search_multi_token_and_ranking():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    token = f"RankToken{suffix}"
    cat_slug = f"cat-rank-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    exact = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Exact {suffix}",
        slug=f"exact-match-{suffix}",
        brand=token,
    )
    _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Prefix {suffix}",
        slug=f"prefix-match-{suffix}",
        brand=f"{token}Plus",
    )
    _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Contains {suffix}",
        slug=f"contains-word-{suffix}",
        brand=f"X{token}X",
    )

    response = client.get(
        "/api/products/search",
        params={"q": token, "page": 1, "page_size": 10},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    ids = [item["id"] for item in data]
    assert exact["id"] in ids
    assert ids[0] == exact["id"]


def test_search_requires_all_tokens():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-and-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    match = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Alpha Beta {suffix}",
        slug=f"alpha-beta-{suffix}",
        brand="Gamma",
    )
    _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Alpha Only {suffix}",
        slug=f"alpha-only-{suffix}",
        brand="Other",
    )

    response = client.get(
        "/api/products/search",
        params={"q": "alpha beta", "page_size": 50},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert match["id"] in ids


def test_list_products_search_by_sku():
    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"cat-sku-{suffix}"
    cat_id = _create_category(headers, name=f"Кат {suffix}", slug=cat_slug)
    product = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"Any Name",
        slug=f"any-{suffix}",
        sku="SKU-ABC-123",
    )

    response = client.get("/api/products", params={"search": "SKU-ABC", "page_size": 20})
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert product["id"] in ids


def test_list_products_filter_by_spec_template():
    import json

    headers = _admin_headers()
    suffix = uuid4().hex[:8]
    cat_slug = f"oled-tvs-{suffix}"
    cat_id = _create_category(headers, name=f"OLED телевизоры {suffix}", slug=cat_slug)
    smart_tv = _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"TV Smart {suffix}",
        slug=f"tv-smart-{suffix}",
        specs={"Поддержка Smart TV": "есть", "Разрешение экрана": "4K Ultra HD"},
    )
    _create_product(
        headers,
        category_id=cat_id,
        category_slug=cat_slug,
        name=f"TV Basic {suffix}",
        slug=f"tv-basic-{suffix}",
        specs={"Поддержка Smart TV": "нет", "Разрешение экрана": "Full HD"},
    )

    spec_filters = json.dumps({"Поддержка Smart TV": ["есть"]}, ensure_ascii=False)
    response = client.get(
        "/api/products",
        params={"category": cat_slug, "spec_filters": spec_filters, "page_size": 50},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert smart_tv["id"] in ids
    assert len(ids) == 1

    meta = client.get(
        "/api/products/filters/meta",
        params={"category": cat_slug},
    )
    assert meta.status_code == 200
    facets = meta.json()["data"]["specFacets"]
    assert "Поддержка Smart TV" in facets
    assert "есть" in facets["Поддержка Smart TV"]
    assert "нет" in facets["Поддержка Smart TV"]

    meta_filtered = client.get(
        "/api/products/filters/meta",
        params={"category": cat_slug, "spec_filters": spec_filters},
    )
    assert meta_filtered.status_code == 200
    facets_filtered = meta_filtered.json()["data"]["specFacets"]
    assert "Разрешение экрана" in facets_filtered
    assert "4K Ultra HD" in facets_filtered["Разрешение экрана"]
    assert "Full HD" in facets_filtered["Разрешение экрана"]

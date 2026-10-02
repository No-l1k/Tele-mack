from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.product_spec_templates import normalize_spec_templates

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
    specs: dict,
) -> dict:
    payload = {
        "name": name,
        "slug": slug,
        "description": "Описание",
        "shortDescription": "Кратко",
        "price": 1000,
        "categoryId": category_id,
        "categorySlug": category_slug,
        "brand": "Testbrand",
        "specs": specs,
        "stockStatus": "in_stock",
        "inStock": True,
        "isNew": False,
        "rating": 4.8,
        "reviewsCount": 1,
    }
    response = client.post("/api/products", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    return response.json()["data"]


def test_normalize_spec_templates_drops_empty_and_dedupes():
    result = normalize_spec_templates(
        [
            {
                "id": "tpl-1",
                "title": "  Кабели ",
                "match": [" кабель ", "кабель", ""],
                "categoryIds": ["12", 12, 0, "x"],
                "specs": [
                    {"name": "  Тип  ", "values": ["HDMI", " HDMI ", ""]},
                    {"name": "", "values": ["skip"]},
                ],
            },
            {"title": "", "specs": []},
        ]
    )
    assert result == [
        {
            "id": "tpl-1",
            "title": "Кабели",
            "match": ["кабель"],
            "categoryIds": [12],
            "specs": [{"name": "Тип", "values": ["HDMI"]}],
        }
    ]


def test_admin_spec_templates_require_auth():
    response = client.get("/api/admin/spec-templates")
    assert response.status_code in {401, 403}


def test_admin_spec_templates_get_defaults_then_save():
    headers = _admin_headers()
    response = client.get("/api/admin/spec-templates", headers=headers)
    assert response.status_code == 200
    original = response.json()["data"]["templates"]
    assert isinstance(original, list)
    assert original
    assert original[0]["title"]
    assert original[0]["specs"]

    saved = [
        {
            "id": "custom-cables",
            "title": "Кабели",
            "match": ["кабель"],
            "categoryIds": [],
            "specs": [{"name": "Тип разъёма", "values": ["HDMI", "DisplayPort"]}],
        }
    ]
    try:
        update = client.put("/api/admin/spec-templates", headers=headers, json={"templates": saved})
        assert update.status_code == 200, update.text
        assert update.json()["data"]["templates"][0]["title"] == "Кабели"

        again = client.get("/api/admin/spec-templates", headers=headers)
        assert again.status_code == 200
        loaded = again.json()["data"]["templates"]
        assert len(loaded) == 1
        assert loaded[0]["specs"][0]["name"] == "Тип разъёма"
        assert loaded[0]["specs"][0]["values"] == ["HDMI", "DisplayPort"]
    finally:
        restore = client.put("/api/admin/spec-templates", headers=headers, json={"templates": original})
        assert restore.status_code == 200, restore.text


def test_saved_template_binds_to_category_and_descendants():
    headers = _admin_headers()
    original = client.get("/api/admin/spec-templates", headers=headers).json()["data"]["templates"]
    suffix = uuid4().hex[:8]
    parent_slug = f"cables-{suffix}"
    child_slug = f"hdmi-{suffix}"
    parent_id = _create_category(headers, name=f"Кабели {suffix}", slug=parent_slug)
    child_id = _create_category(headers, name=f"HDMI {suffix}", slug=child_slug, parent_id=parent_id)

    try:
        update = client.put(
            "/api/admin/spec-templates",
            headers=headers,
            json={
                "templates": [
                    {
                        "title": "Кабели",
                        "match": [],
                        "categoryIds": [parent_id],
                        "specs": [{"name": "Тип разъёма", "values": ["HDMI"]}],
                    },
                    *original,
                ]
            },
        )
        assert update.status_code == 200, update.text

        _create_product(
            headers,
            category_id=child_id,
            category_slug=child_slug,
            name=f"HDMI кабель {suffix}",
            slug=f"hdmi-cable-{suffix}",
            specs={"Тип разъёма": "HDMI"},
        )

        meta = client.get("/api/products/filters/meta", params={"category": child_slug})
        assert meta.status_code == 200
        facets = meta.json()["data"]["specFacets"]
        assert "Тип разъёма" in facets
        assert "HDMI" in facets["Тип разъёма"]
    finally:
        restore = client.put("/api/admin/spec-templates", headers=headers, json={"templates": original})
        assert restore.status_code == 200, restore.text

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_yandex_feed_returns_xml():
    response = client.get("/api/feeds/yandex.yml")
    assert response.status_code == 200
    assert "application/xml" in response.headers.get("content-type", "")
    body = response.text
    assert "<yml_catalog" in body
    assert "<shop>" in body
    assert "TeleMakc" in body
    assert "RUR" in body


def test_yandex_feed_head_ok():
    response = client.head("/api/feeds/yandex.yml")
    assert response.status_code == 200

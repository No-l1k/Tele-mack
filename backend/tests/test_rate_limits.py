from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_public_lookup_rate_limited_per_ip():
    headers = {"X-Forwarded-For": "203.0.113.10"}
    for index in range(8):
        response = client.post(
            "/api/orders/public/lookup",
            json={"orderNumber": 1, "phone": f"7900111223{index}"},
            headers=headers,
        )
        assert response.status_code == 404

    blocked = client.post(
        "/api/orders/public/lookup",
        json={"orderNumber": 1, "phone": "79001112239"},
        headers=headers,
    )
    assert blocked.status_code == 429

    other_ip = client.post(
        "/api/orders/public/lookup",
        json={"orderNumber": 1, "phone": "79001112238"},
        headers={"X-Forwarded-For": "203.0.113.20"},
    )
    assert other_ip.status_code == 404


def test_public_lookup_rate_limited_per_phone():
    phone = "79005550101"
    for index in range(8):
        response = client.post(
            "/api/orders/public/lookup",
            json={"orderNumber": 6200 + index, "phone": phone},
            headers={"X-Forwarded-For": f"198.51.100.{index + 1}"},
        )
        assert response.status_code == 404

    blocked = client.post(
        "/api/orders/public/lookup",
        json={"orderNumber": 6210, "phone": phone},
        headers={"X-Forwarded-For": "198.51.100.99"},
    )
    assert blocked.status_code == 429

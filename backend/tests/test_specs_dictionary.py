from app.services.specs_dictionary import build_specs_dictionary


def test_dictionary_groups_values_by_name_and_skips_images():
    rows = [
        ({"images": ["/x.png"], "currencyId": "RUR", "refresh": "60", "Цвет": "Чёрный", "Диагональ": "55"}, True),
        ({"Цвет": "Белый", "Мощность": "100 Вт", "channels": "2.1", "bandwidth": "100"}, False),
        ({"Цвет": "Чёрный", "sourceUrl": "https://example.com"}, True),
    ]

    data = build_specs_dictionary(rows)
    by_name = {item["name"]: item for item in data}

    assert "images" not in by_name
    assert "currencyId" not in by_name
    assert "refresh" not in by_name
    assert "channels" not in by_name
    assert "bandwidth" not in by_name
    assert "sourceUrl" not in by_name
    assert {item["value"] for item in by_name["Цвет"]["values"]} == {"Чёрный", "Белый"}
    assert {item["value"] for item in by_name["Диагональ"]["values"]} == {"55"}
    assert {item["value"] for item in by_name["Мощность"]["values"]} == {"100 Вт"}
    assert by_name["Цвет"]["inCategory"] is True
    assert by_name["Цвет"]["usageCount"] == 3
    assert by_name["Мощность"]["inCategory"] is False
    assert by_name["Диагональ"]["values"][0]["value"] not in {item["value"] for item in by_name["Цвет"]["values"]}

from app.services.csv_export import iter_excel_csv_bytes


def test_iter_excel_csv_bytes_uses_bom_and_semicolon_delimiter():
    chunks = list(
        iter_excel_csv_bytes(
            ["name", "price"],
            [["Телевизор", 1000]],
        )
    )
    body = b"".join(chunks)
    assert body.startswith(b"\xef\xbb\xbf")
    text = body.decode("utf-8-sig")
    assert text.startswith("name;price\r\n")
    assert "Телевизор;1000" in text

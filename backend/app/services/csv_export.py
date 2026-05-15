"""CSV export tuned for Excel on Windows (RU locale): UTF-8 BOM + semicolon delimiter."""

import csv
import io
from collections.abc import Iterable, Iterator, Sequence
from typing import Any

from fastapi.responses import StreamingResponse

EXCEL_CSV_DELIMITER = ";"
EXCEL_UTF8_BOM = b"\xef\xbb\xbf"


def iter_excel_csv_bytes(
    header: Sequence[str],
    rows: Iterable[Sequence[Any]],
) -> Iterator[bytes]:
    buffer = io.StringIO()
    writer = csv.writer(
        buffer,
        delimiter=EXCEL_CSV_DELIMITER,
        lineterminator="\r\n",
        quoting=csv.QUOTE_MINIMAL,
    )

    def emit() -> bytes:
        chunk = buffer.getvalue().encode("utf-8")
        buffer.seek(0)
        buffer.truncate(0)
        return chunk

    writer.writerow(header)
    yield EXCEL_UTF8_BOM + emit()

    for row in rows:
        writer.writerow(row)
        yield emit()


def excel_csv_response(
    filename: str,
    header: Sequence[str],
    rows: Iterable[Sequence[Any]],
) -> StreamingResponse:
    return StreamingResponse(
        iter_excel_csv_bytes(header, rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

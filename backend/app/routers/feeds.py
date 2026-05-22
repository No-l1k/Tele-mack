from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.yandex_feed import build_yandex_feed_xml

router = APIRouter(prefix="/feeds", tags=["feeds"])


@router.head("/yandex.yml")
def yandex_products_feed_head() -> Response:
    """HEAD для проверок (curl -I) и роботов; тело не строим."""
    return Response(
        status_code=200,
        headers={"Cache-Control": "public, max-age=900"},
    )


@router.get("/yandex.yml")
def yandex_products_feed(db: Session = Depends(get_db)) -> Response:
    """
    Публичный YML-фид для Яндекс Товаров.
    URL для кабинета: https://<ваш-домен>/api/feeds/yandex.yml
    """
    body = build_yandex_feed_xml(db)
    return Response(
        content=body,
        media_type="application/xml; charset=utf-8",
        headers={
            "Cache-Control": "public, max-age=900",
        },
    )

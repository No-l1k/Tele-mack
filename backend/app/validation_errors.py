from __future__ import annotations

from typing import Any

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

FIELD_LABELS: dict[str, str] = {
    "name": "Имя",
    "phone": "Телефон",
    "email": "Email",
    "message": "Сообщение",
    "subject": "Тема",
    "productId": "Товар",
    "quantity": "Количество",
    "comment": "Комментарий",
    "orderNumber": "Номер заказа",
    "items": "Товары",
    "password": "Пароль",
    "login": "Логин",
    "rating": "Оценка",
    "text": "Текст отзыва",
    "street": "Улица",
    "house": "Дом",
    "city": "Город",
}


def _field_label(loc: tuple[Any, ...]) -> str:
    for part in reversed(loc):
        if isinstance(part, str) and part not in ("body", "query", "path"):
            return FIELD_LABELS.get(part, part)
    return "Поле"


def translate_validation_issue(issue: dict[str, Any]) -> str:
    err_type = issue.get("type", "")
    ctx = issue.get("ctx") or {}
    label = _field_label(tuple(issue.get("loc") or ()))

    if err_type == "string_too_short":
        return f"«{label}»: минимум {ctx.get('min_length', '?')} символов"
    if err_type == "string_too_long":
        return f"«{label}»: максимум {ctx.get('max_length', '?')} символов"
    if err_type == "missing":
        return f"Заполните поле «{label}»"
    if err_type == "too_short":
        return f"«{label}»: минимум {ctx.get('min_length', '?')} элементов"
    if err_type in ("greater_than", "greater_than_equal"):
        limit = ctx.get("gt") or ctx.get("ge")
        return f"«{label}»: значение должно быть больше {limit}"
    if err_type in ("less_than", "less_than_equal"):
        limit = ctx.get("lt") or ctx.get("le")
        return f"«{label}»: значение должно быть не больше {limit}"
    if err_type == "int_parsing":
        return f"«{label}»: введите целое число"
    if err_type == "value_error":
        return str(issue.get("msg", "Некорректное значение")).replace("Value error, ", "")

    msg = str(issue.get("msg", ""))
    if msg.startswith("String should have at least"):
        return f"«{label}»: минимум {ctx.get('min_length', '?')} символов"
    if msg.startswith("String should have at most"):
        return f"«{label}»: максимум {ctx.get('max_length', '?')} символов"
    if msg.startswith("Field required"):
        return f"Заполните поле «{label}»"

    return msg or "Ошибка валидации"


async def validation_exception_handler(_request, exc: RequestValidationError):
    issues = exc.errors()
    detail = [{"loc": issue.get("loc"), "msg": translate_validation_issue(issue), "type": issue.get("type")} for issue in issues]
    return JSONResponse(status_code=422, content={"detail": detail})

from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request

_WINDOWS: dict[str, deque[float]] = defaultdict(deque)
_MAX_BUCKETS = 20_000


def client_ip(request: Request) -> str:
    """Клиент за nginx: первый адрес из X-Forwarded-For, иначе TCP-peer."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _prune_windows() -> None:
    if len(_WINDOWS) <= _MAX_BUCKETS:
        return
    empty_keys = [key for key, bucket in _WINDOWS.items() if not bucket]
    for key in empty_keys:
        _WINDOWS.pop(key, None)
    overflow = len(_WINDOWS) - _MAX_BUCKETS
    if overflow > 0:
        for key in list(_WINDOWS.keys())[:overflow]:
            _WINDOWS.pop(key, None)


def rate_limit(
    request: Request,
    key: str,
    max_requests: int,
    window_seconds: int,
    *,
    by: str | None = None,
) -> None:
    identity = by if by is not None else client_ip(request)
    bucket_key = f"{key}:{identity}"
    now = time()
    threshold = now - window_seconds
    bucket = _WINDOWS[bucket_key]
    while bucket and bucket[0] < threshold:
        bucket.popleft()
    if len(bucket) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов. Подождите минуту и попробуйте снова.",
        )
    bucket.append(now)
    _prune_windows()

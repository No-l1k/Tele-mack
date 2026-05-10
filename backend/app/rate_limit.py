from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request

_WINDOWS: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(request: Request, key: str, max_requests: int, window_seconds: int) -> None:
    client_ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{client_ip}"
    now = time()
    threshold = now - window_seconds
    bucket = _WINDOWS[bucket_key]
    while bucket and bucket[0] < threshold:
        bucket.popleft()
    if len(bucket) >= max_requests:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    bucket.append(now)

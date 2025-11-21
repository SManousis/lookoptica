# app/middleware/rate_limit.py
import time
from typing import Callable, Dict, List

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter middleware.

    Per-IP + per-path buckets.

    NOTE:
    - This is per-process and resets on restart.
    - Good enough for your single-instance dev / small prod.
    - For multi-instance, you'd move storage to Redis, etc.
    """

    def __init__(
        self,
        app,
        max_requests: int = 10,
        window_seconds: int = 60,
        protected_prefixes: list[str] | None = None,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.protected_prefixes = protected_prefixes or []
        # key: (ip, path) -> list[timestamps]
        self._buckets: Dict[str, List[float]] = {}

    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path

        # Only apply to selected prefixes
        if not any(path.startswith(prefix) for prefix in self.protected_prefixes):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{path}"
        now = time.time()

        # Keep timestamps only within the window
        timestamps = [t for t in self._buckets.get(key, []) if now - t < self.window_seconds]

        if len(timestamps) >= self.max_requests:
            # Too many requests from this IP to this path
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

        timestamps.append(now)
        self._buckets[key] = timestamps

        return await call_next(request)

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self.bucket = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.time()
        q = self.bucket[key]
        while q and q[0] < now - self.window_seconds:
            q.popleft()
        if len(q) >= self.limit:
            return JSONResponse(
                status_code=429,
                content={"success": False, "data": {}, "message": "Rate limit exceeded", "code": 429},
            )
        q.append(now)
        return await call_next(request)

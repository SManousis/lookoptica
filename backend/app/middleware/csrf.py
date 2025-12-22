# app/middleware/csrf.py
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Double-submit cookie CSRF protection for admin APIs.

    - For unsafe methods (POST/PUT/PATCH/DELETE),
      on paths starting with /api/admin,
      we require:
        - Cookie: look_admin_csrf
        - Header: X-CSRF-Token
      And they must match exactly.

    Upload endpoints are explicitly exempt.
    """

    def __init__(
        self,
        app,
        protected_prefixes: list[str] | None = None,
        exempt_paths: list[str] | None = None,
    ):
        super().__init__(app)
        self.protected_prefixes = protected_prefixes or ["/api/admin"]
        self.exempt_paths = set(exempt_paths or ["/api/admin/auth/login"])

    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        # ✅ HARD EXEMPT uploads (multipart/form-data)
        if path.startswith("/api/admin/uploads"):
            return await call_next(request)

        # Allow explicit exemptions (login, etc.)
        if any(path.startswith(p) for p in self.exempt_paths):
            return await call_next(request)

        # Only check unsafe methods
        if method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return await call_next(request)

        # Only protect admin APIs
        if not any(path.startswith(p) for p in self.protected_prefixes):
            return await call_next(request)

        cookie_token = request.cookies.get("look_admin_csrf")
        header_token = request.headers.get("X-CSRF-Token")

        if not cookie_token or not header_token or cookie_token != header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed",
            )

        return await call_next(request)

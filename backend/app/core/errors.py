"""Consistent error envelope and exception handlers.

Every error leaves the API as::

    {"success": false, "error": {"code": "...", "message": "..."}}

Internal exception details, stack traces and filesystem paths are logged
server-side only and never returned to the client.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("emovision.errors")


class ApiError(Exception):
    """An expected failure with a stable machine-readable code."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_body(code: str, message: str) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = sorted({".".join(str(p) for p in err.get("loc", ())[1:]) or "body" for err in exc.errors()})
        return JSONResponse(
            status_code=422,
            content=error_body("validation_error", f"Invalid or missing request field(s): {', '.join(fields)}."),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, content=error_body(code, message))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server error: %s", type(exc).__name__)
        return JSONResponse(
            status_code=500, content=error_body("internal_error", "An unexpected server error occurred.")
        )

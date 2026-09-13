import os

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import (
    auth,
    dashboard,
    items,
    organizations,
    public,
    reports,
    sales,
    team,
    transactions,
)
from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.middleware.request_id import RequestContextMiddleware

configure_logging()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

app = FastAPI(
    title=settings.APP_NAME,
    description="The operating system for your yard sale.",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": _code_for_status(exc.status_code), "message": str(exc.detail)}},
    )


@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    request_id = getattr(request.state, "request_id", "-")
    logger.error("Database error [%s]: %s", request_id, exc, extra={"request_id": request_id})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again."}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "-")
    logger.error("Unhandled error [%s]: %s", request_id, exc, extra={"request_id": request_id})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again."}},
    )


def _code_for_status(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
    }.get(status_code, "ERROR")


@app.get("/")
def root():
    return {"service": settings.APP_NAME, "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}


api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(organizations.router, prefix=api_prefix)
app.include_router(sales.router, prefix=api_prefix)
app.include_router(items.router, prefix=api_prefix)
app.include_router(transactions.router, prefix=api_prefix)
app.include_router(team.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(public.router, prefix=api_prefix)

"""FastAPI application entrypoint for RAGHUPATI."""

from __future__ import annotations

import logging
import os

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.auth import JWTAuthMiddleware
from api.middleware.logging import RequestLoggingMiddleware
from api.routes import agents as agents_routes
from api.routes import events as events_routes
from api.routes import github as github_routes
from api.routes import health as health_routes
from api.routes import incidents as incidents_routes
from api.routes import scan as scan_routes
from api.routes import scans as scans_routes
from api.routes import webhook as webhook_routes
from config.settings import get_settings


def configure_logging() -> None:
    """Configure stdlib logging and structlog for JSON output."""
    level_name = os.getenv("LOG_LEVEL", "INFO")
    logging.basicConfig(level=getattr(logging, level_name, logging.INFO))
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def create_app() -> FastAPI:
    """Build the FastAPI application with middleware and routers.

    Returns:
        Configured ``FastAPI`` instance.
    """
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(JWTAuthMiddleware)
    app.include_router(health_routes.router)
    app.include_router(incidents_routes.router)
    app.include_router(agents_routes.router)
    app.include_router(scan_routes.router)
    app.include_router(scans_routes.router)
    app.include_router(github_routes.router)
    app.include_router(events_routes.router)
    app.include_router(webhook_routes.router)
    return app


configure_logging()
app = create_app()

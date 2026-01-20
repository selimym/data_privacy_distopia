"""Structured logging configuration for the application."""

import logging
import sys
from typing import Any

from datafusion.config import settings


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured log data."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structured data."""
        # Base log data
        log_data: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        if hasattr(record, "npc_id"):
            log_data["npc_id"] = record.npc_id
        if hasattr(record, "operator_id"):
            log_data["operator_id"] = record.operator_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        # Format as key=value pairs for easy parsing
        parts = [f"{key}={repr(value)}" for key, value in log_data.items()]
        return " ".join(parts)


def setup_logging() -> None:
    """Configure application logging with structured output."""

    # Determine log level from settings
    log_level = logging.DEBUG if settings.debug else logging.INFO

    # Create formatter
    if settings.debug:
        # Human-readable format for development
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        # Structured format for production
        formatter = StructuredFormatter(
            datefmt="%Y-%m-%dT%H:%M:%S",
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Set levels for specific loggers
    logging.getLogger("datafusion").setLevel(log_level)

    # Reduce noise from third-party libraries
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.debug else logging.WARNING
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(
        f"Logging configured: level={logging.getLevelName(log_level)}, debug={settings.debug}"
    )


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name.

    Args:
        name: Logger name, typically __name__ of the module

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

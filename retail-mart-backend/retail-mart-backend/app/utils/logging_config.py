"""
Retail Mart — Centralized Logging Configuration
================================================
Single place that wires up the application-wide Python logger.

Logger hierarchy
----------------
  retail_mart                    <- application root (configured here)
  retail_mart.auth               <- auth routes (uses logging.getLogger(__name__))
  retail_mart.orders             <- orders routes
  retail_mart.payments           <- payments routes
  retail_mart.shipments          <- shipments routes
  …

Handlers & Files (Daily Rotation at Midnight)
---------------------------------------------
  ConsoleHandler         - StreamHandler to sys.stdout, level from config
  retail_mart_debug.log   - TimedRotatingFileHandler (DEBUG only)
  retail_mart.log         - TimedRotatingFileHandler (INFO only - normal application log)
  retail_mart_warning.log - TimedRotatingFileHandler (WARNING only)
  retail_mart_error.log   - TimedRotatingFileHandler (ERROR + CRITICAL only)

Usage (inside a Flask app factory)
-----------------------------------
    from app.utils.logging_config import configure_logging
    configure_logging(app)

Usage in any route / utility module
--------------------------------------
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Something happened")
"""

import logging
import os
import re
import sys
from logging.handlers import TimedRotatingFileHandler

LOGGER_NAME = "retail_mart"
LOG_FORMAT = "%(asctime)s %(levelname)-8s %(name)s [req=%(request_id)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_BACKUP_COUNT = 30
ROTATION_WHEN = "midnight"
ROTATION_INTERVAL = 1
ROTATION_SUFFIX = "%Y-%m-%d"


class RequestIdFilter(logging.Filter):
    """
    Injects ``request_id`` into every log record so the formatter can embed it.
    Falls back to ``-`` when no Flask request context is active (e.g. startup).
    """

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            from flask import g
            record.request_id = getattr(g, "request_id", "-")
        except RuntimeError:
            # No application / request context – e.g. during startup or tests
            record.request_id = "-"
        return True


class ExactLevelFilter(logging.Filter):
    """
    Accepts only log records matching an exact logging level.
    Used to guarantee zero level leakage into non-matching log files.
    """

    def __init__(self, level: int):
        super().__init__()
        self.level = level

    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno == self.level


class MinLevelFilter(logging.Filter):
    """
    Accepts only log records at or above a minimum logging level.
    Used for error logs (ERROR and CRITICAL).
    """

    def __init__(self, min_level: int):
        super().__init__()
        self.min_level = min_level

    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno >= self.min_level


SENSITIVE_PATTERNS = [
    # Bearer tokens (e.g. Bearer eyJhbGciOi...)
    (
        re.compile(r'(Bearer\s+)[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE),
        r'\1[REDACTED]',
    ),
    # Database connection URIs with embedded passwords (e.g. mysql+pymysql://user:pass@host:port/db)
    (
        re.compile(r'(://[^:]+:)([^@]+)(@)'),
        r'\1[REDACTED]\3',
    ),
    # Credit/Debit Card numbers (13-19 digits, possibly separated by spaces or dashes)
    (
        re.compile(r'\b(?:\d[ -]*?){13,19}\b'),
        r'[REDACTED]',
    ),
    # Key-value fields: card_number
    (
        re.compile(
            r'(["\']?card[_-]?number["\']?\s*[:=]\s*["\']?)[0-9 -]+(["\']?)',
            re.IGNORECASE,
        ),
        r'\1[REDACTED]\2',
    ),
    # Key-value fields: passwords, tokens, secrets, API keys, OTPs, CVV, payment signatures
    (
        re.compile(
            r'(["\']?(?:password|passwd|pwd|secret|api[_-]?key|token|access[_-]?token|refresh[_-]?token|jwt|otp|code|cvv|cvc|signature|razorpay_signature|razorpay_key_secret)["\']?\s*[:=]\s*["\']?)([^"\'\s&,]+)(["\']?)',
            re.IGNORECASE,
        ),
        r'\1[REDACTED]\3',
    ),
    # Razorpay key/secret raw tokens (rzp_test_... or rzp_live_...)
    (
        re.compile(r'\brzp_(?:test|live)_[A-Za-z0-9]+\b'),
        r'[REDACTED_RAZORPAY_KEY]',
    ),
]


class SensitiveDataFilter(logging.Filter):
    """
    Scans and redacts sensitive data (passwords, tokens, OTPs, API keys,
    secrets, DB credentials, card details) before records are output.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if record.args:
                record.msg = record.getMessage()
                record.args = ()
            if isinstance(record.msg, str):
                for pattern, repl in SENSITIVE_PATTERNS:
                    record.msg = pattern.sub(repl, record.msg)
        except Exception:
            pass
        return True


def configure_logging(app, logs_dir: str | None = None, force: bool = False) -> logging.Logger:
    """
    Configure the ``retail_mart`` logger and attach handlers to *app*.

    Features:
    - Reads ``LOG_LEVEL`` from ``app.config`` (default: ``INFO``).
    - Reads ``LOG_BACKUP_COUNT`` from ``app.config`` (default: ``30``).
    - Separate log files strictly isolated by log level with daily rotation:
        - retail_mart_debug.log   (DEBUG only)
        - retail_mart.log         (INFO only - normal application / request log)
        - retail_mart_warning.log (WARNING only)
        - retail_mart_error.log   (ERROR and CRITICAL only)
    - Daily rotation via TimedRotatingFileHandler (midnight, UTF-8, date suffix).
    - Redacts sensitive secrets, passwords, tokens, API keys, and credentials.
    - Console handler streaming to sys.stdout with level respecting LOG_LEVEL.
    - Suppresses Werkzeug access logs to avoid duplicate lines.
    - Preserves logger.propagate = False to prevent double-printing to root.
    """

    log_level_name: str = app.config.get("LOG_LEVEL", "INFO").upper()
    log_level: int = getattr(logging, log_level_name, logging.INFO)
    backup_count: int = int(app.config.get("LOG_BACKUP_COUNT", DEFAULT_BACKUP_COUNT))

    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(log_level)
    logger.propagate = False  # prevent double-printing to the root logger

    if force:
        for h in list(logger.handlers):
            try:
                h.close()
            except Exception:
                pass
            logger.removeHandler(h)

    # Guard: only add handlers once (unless forced)
    if logger.handlers:
        for h in logger.handlers:
            if isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler):
                h.setLevel(log_level)
        return logger

    request_id_filter = RequestIdFilter()
    sensitive_filter = SensitiveDataFilter()
    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_id_filter)
    console_handler.addFilter(sensitive_filter)
    logger.addHandler(console_handler)

    if logs_dir is None:
        project_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..")
        )
        logs_dir = os.path.join(project_root, "logs")

    try:
        os.makedirs(logs_dir, exist_ok=True)

        # 1. DEBUG only → retail_mart_debug.log
        debug_handler = TimedRotatingFileHandler(
            os.path.join(logs_dir, "retail_mart_debug.log"),
            when=ROTATION_WHEN,
            interval=ROTATION_INTERVAL,
            backupCount=backup_count,
            encoding="utf-8",
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.suffix = ROTATION_SUFFIX
        debug_handler.setFormatter(formatter)
        debug_handler.addFilter(ExactLevelFilter(logging.DEBUG))
        debug_handler.addFilter(request_id_filter)
        debug_handler.addFilter(sensitive_filter)
        logger.addHandler(debug_handler)

        # 2. INFO only → retail_mart.log (normal application / request log)
        info_handler = TimedRotatingFileHandler(
            os.path.join(logs_dir, "retail_mart.log"),
            when=ROTATION_WHEN,
            interval=ROTATION_INTERVAL,
            backupCount=backup_count,
            encoding="utf-8",
        )
        info_handler.setLevel(logging.INFO)
        info_handler.suffix = ROTATION_SUFFIX
        info_handler.setFormatter(formatter)
        info_handler.addFilter(ExactLevelFilter(logging.INFO))
        info_handler.addFilter(request_id_filter)
        info_handler.addFilter(sensitive_filter)
        logger.addHandler(info_handler)

        # 3. WARNING only → retail_mart_warning.log
        warning_handler = TimedRotatingFileHandler(
            os.path.join(logs_dir, "retail_mart_warning.log"),
            when=ROTATION_WHEN,
            interval=ROTATION_INTERVAL,
            backupCount=backup_count,
            encoding="utf-8",
        )
        warning_handler.setLevel(logging.WARNING)
        warning_handler.suffix = ROTATION_SUFFIX
        warning_handler.setFormatter(formatter)
        warning_handler.addFilter(ExactLevelFilter(logging.WARNING))
        warning_handler.addFilter(request_id_filter)
        warning_handler.addFilter(sensitive_filter)
        logger.addHandler(warning_handler)

        # 4. ERROR and CRITICAL only → retail_mart_error.log
        error_handler = TimedRotatingFileHandler(
            os.path.join(logs_dir, "retail_mart_error.log"),
            when=ROTATION_WHEN,
            interval=ROTATION_INTERVAL,
            backupCount=backup_count,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.suffix = ROTATION_SUFFIX
        error_handler.setFormatter(formatter)
        error_handler.addFilter(MinLevelFilter(logging.ERROR))
        error_handler.addFilter(request_id_filter)
        error_handler.addFilter(sensitive_filter)
        logger.addHandler(error_handler)

    except Exception as exc:
        # Log directory creation or file handler setup failed (e.g. read-only filesystem in serverless).
        # Console logging still works; file logging is silently skipped.
        logger.warning("Could not create logs directory at %s: %s", logs_dir, exc)

    werkzeug_logger = logging.getLogger("werkzeug")
    werkzeug_logger.setLevel(logging.WARNING)

    flask_logger = logging.getLogger("flask.app")
    flask_logger.handlers = []
    flask_logger.propagate = True   # bubble up to retail_mart via getLogger chain

    app.logger.handlers = []
    app.logger.propagate = True

    logger.info(
        "Logging initialised level=%s file=%s",
        log_level_name,
        os.path.join(logs_dir, "retail_mart.log"),
    )

    setup_sql_instrumentation()

    return logger


_SQL_INSTRUMENTED = False


def setup_sql_instrumentation() -> None:
    """
    Attaches safe, non-PII SQLAlchemy cursor event listeners when DEBUG logging is active.
    Records operation type, safe table name, affected row counts, and duration in ms.
    Never logs customer personal information, credentials, or sensitive parameter values.
    """
    global _SQL_INSTRUMENTED
    if _SQL_INSTRUMENTED:
        return
    try:
        import time
        from sqlalchemy import event
        from sqlalchemy.engine import Engine

        sql_logger = logging.getLogger(f"{LOGGER_NAME}.sql")

        @event.listens_for(Engine, "before_cursor_execute")
        def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if context is not None and sql_logger.isEnabledFor(logging.DEBUG):
                context._sql_start = time.monotonic()

        @event.listens_for(Engine, "after_cursor_execute")
        def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if not sql_logger.isEnabledFor(logging.DEBUG):
                return
            duration_ms = 0
            if context is not None and hasattr(context, "_sql_start"):
                duration_ms = int((time.monotonic() - context._sql_start) * 1000)
            first_token = statement.strip().split()[0].upper() if statement else "SQL"
            tbl_match = re.search(r'(?:FROM|INTO|UPDATE)\s+[`"]?([a-zA-Z0-9_]+)[`"]?', statement, re.IGNORECASE)
            table_name = tbl_match.group(1) if tbl_match else "db"
            rowcount = getattr(cursor, "rowcount", -1)
            sql_logger.debug(
                "[SQL_EXEC] op=%s table=%s rows=%d duration_ms=%d",
                first_token, table_name, rowcount, duration_ms
            )

        @event.listens_for(Engine, "handle_error")
        def _handle_sql_error(context):
            first_token = context.statement.strip().split()[0].upper() if context.statement else "SQL"
            tbl_match = re.search(r'(?:FROM|INTO|UPDATE)\s+[`"]?([a-zA-Z0-9_]+)[`"]?', context.statement or "", re.IGNORECASE)
            table_name = tbl_match.group(1) if tbl_match else "db"
            sql_logger.error(
                "[SQL_ERROR] op=%s table=%s error=%s",
                first_token, table_name, context.original_exception
            )

        _SQL_INSTRUMENTED = True
    except Exception:
        pass


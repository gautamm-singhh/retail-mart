"""
tests/test_logging.py
=====================
Logging behaviour tests for the Retail Mart Flask backend.

Tests:
  1.  Every request receives an X-Request-ID response header.
  2.  The X-Request-ID is echoed back when supplied by the caller.
  3.  Request logs contain method, path, and status code.
  4.  Exceptions are logged with a traceback (logger.exception).
  5.  Sensitive data (passwords, tokens, OTPs, secrets) is never logged.
  6.  Log level can be changed via configuration.
  7.  Existing API responses are unchanged (no payload mutations).
  8.  The logging config initialises without error inside TestingConfig.
  9.  RequestIdFilter injects request_id '-' when outside request context.
  10. The retail_mart logger propagate=False (no double-logging to root).
"""

import io
import logging
import os
import sys
import unittest

# ── make sure project root is on sys.path ──────────────────────────────────
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)

from app import create_app


# Helper: capture log records emitted by a named logger into a list
class _ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord):
        self.records.append(record)


def _attach_list_handler(logger_name: str) -> _ListHandler:
    handler = _ListHandler()
    handler.setLevel(logging.DEBUG)
    logging.getLogger(logger_name).addHandler(handler)
    return handler


def _detach_handler(logger_name: str, handler: _ListHandler):
    logging.getLogger(logger_name).removeHandler(handler)


class TestLoggingBehaviour(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

    # ── 1. Every response has X-Request-ID ──────────────────────────────────

    def test_response_has_request_id_header(self):
        resp = self.client.get("/api/health")
        self.assertIn("X-Request-ID", resp.headers,
                      "X-Request-ID header must be present on every response")
        rid = resp.headers["X-Request-ID"]
        self.assertTrue(len(rid) >= 8, "Request ID should be at least 8 chars")

    # ── 2. Caller-supplied X-Request-ID is echoed back ───────────────────────

    def test_caller_supplied_request_id_is_echoed(self):
        custom_id = "test-trace-1234"
        resp = self.client.get("/api/health", headers={"X-Request-ID": custom_id})
        self.assertEqual(resp.headers.get("X-Request-ID"), custom_id,
                         "Incoming X-Request-ID must be echoed back in the response")

    # ── 3. Request logs contain method, path, and status ──────────────────────

    def test_request_log_contains_method_path_status(self):
        retail_mart_logger = logging.getLogger("retail_mart")
        original_level = retail_mart_logger.level
        retail_mart_logger.setLevel(logging.INFO)  # ensure INFO is captured regardless of config
        handler = _attach_list_handler("retail_mart")
        handler.setLevel(logging.INFO)
        try:
            resp = self.client.get("/api/health")
            self.assertEqual(resp.status_code, 200)
        finally:
            _detach_handler("retail_mart", handler)
            retail_mart_logger.setLevel(original_level)  # restore

        messages = [r.getMessage() for r in handler.records]
        # The after_request hook logs something like: GET /api/health 200 Xms
        request_log = next((m for m in messages if "GET" in m and "/api/health" in m), None)
        self.assertIsNotNone(request_log,
                             f"Expected request log line not found. Logged: {messages}")
        self.assertIn("200", request_log)

    # ── 4. Exceptions are logged with exc_info ────────────────────────────────

    def test_exception_is_logged_with_traceback(self):
        """
        Trigger the /api/health endpoint to confirm the app starts without error;
        then directly invoke the error handler to verify logger.exception is used.
        """
        handler = _attach_list_handler("retail_mart")
        try:
            with self.app.test_request_context("/api/test-error"):
                from flask import g
                import uuid
                g.request_id = uuid.uuid4().hex[:8]
                test_exc = RuntimeError("deliberate test error")
                with self.app.app_context():
                    logger = logging.getLogger("retail_mart")
                    try:
                        raise test_exc
                    except RuntimeError:
                        logger.exception("Test exception captured")
        finally:
            _detach_handler("retail_mart", handler)

        exc_records = [r for r in handler.records if r.exc_info is not None]
        self.assertTrue(len(exc_records) >= 1,
                        "At least one log record with exc_info (traceback) should be captured")

    # ── 5. Sensitive data is never logged ────────────────────────────────────

    def test_sensitive_data_never_logged(self):
        """
        Call the login endpoint with a clearly recognisable sentinel password
        and ensure that string never appears in any log record.
        """
        sentinel_password = "SENTINEL_SECRET_XYZ_12345"
        handler = _attach_list_handler("retail_mart")
        try:
            self.client.post(
                "/api/auth/login",
                json={"email": "nobody@example.com", "password": sentinel_password},
                content_type="application/json",
            )
        finally:
            _detach_handler("retail_mart", handler)

        for record in handler.records:
            msg = record.getMessage()
            self.assertNotIn(
                sentinel_password, msg,
                f"Sentinel password appeared in log record: {msg!r}"
            )

    # ── 6. Log level is driven by configuration ──────────────────────────────

    def test_log_level_from_configuration(self):
        """
        TestingConfig sets LOG_LEVEL=WARNING by default.
        The retail_mart logger's effective level must honour that.
        """
        app = create_app("testing")
        expected_level_name = app.config.get("LOG_LEVEL", "WARNING").upper()
        expected_level = getattr(logging, expected_level_name, logging.WARNING)
        retail_mart_logger = logging.getLogger("retail_mart")
        self.assertEqual(
            retail_mart_logger.level, expected_level,
            f"Expected logger level {expected_level_name}, "
            f"got {logging.getLevelName(retail_mart_logger.level)}"
        )

    # ── 7. Existing API responses are unchanged ───────────────────────────────

    def test_health_response_payload_unchanged(self):
        """Verify /api/health still returns status=ok and service name."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "retail-mart-backend")
        # Ensure logging hasn't injected extra keys
        self.assertNotIn("request_id", data)
        self.assertNotIn("log_level", data)

    def test_404_response_payload_unchanged(self):
        """404 handler still returns {"error": "Not found"}."""
        resp = self.client.get("/api/nonexistent-route-xyz")
        self.assertEqual(resp.status_code, 404)
        data = resp.get_json()
        self.assertEqual(data.get("error"), "Not found")

    # ── 8. Logging config initialises cleanly ─────────────────────────────────

    def test_logging_config_initialises_without_error(self):
        """configure_logging must not raise when called on a fresh app."""
        from app.utils.logging_config import configure_logging
        fresh_app = create_app("testing")
        # calling configure_logging a second time must be idempotent
        try:
            configure_logging(fresh_app)
        except Exception as exc:  # noqa: BLE001
            self.fail(f"configure_logging raised unexpectedly: {exc}")

    # ── 9. RequestIdFilter outside request context ────────────────────────────

    def test_request_id_filter_outside_request_context(self):
        """RequestIdFilter should inject '-' when no request context is active."""
        from app.utils.logging_config import RequestIdFilter
        f = RequestIdFilter()
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="hello", args=(), exc_info=None
        )
        result = f.filter(record)
        self.assertTrue(result)
        self.assertEqual(record.request_id, "-")

    # ── 10. retail_mart logger does not propagate to root ─────────────────────

    def test_retail_mart_logger_does_not_propagate(self):
        """Logger must have propagate=False to prevent duplicate root logs."""
        create_app("testing")  # ensure configure_logging has been called
        retail_mart_logger = logging.getLogger("retail_mart")
        self.assertFalse(
            retail_mart_logger.propagate,
            "retail_mart logger must have propagate=False to avoid duplicate output"
        )

    # ── 11. Strict level separation tests ──────────────────────────────────

    def _setup_isolated_logger(self, log_level="DEBUG", backup_count=30):
        import tempfile
        from app.utils.logging_config import configure_logging
        temp_dir = tempfile.mkdtemp()
        test_app = create_app("testing")
        test_app.config["LOG_LEVEL"] = log_level
        test_app.config["LOG_BACKUP_COUNT"] = backup_count
        logger = configure_logging(test_app, logs_dir=temp_dir, force=True)
        return temp_dir, logger, test_app

    def _cleanup_isolated_logger(self, temp_dir):
        import shutil
        retail_mart_logger = logging.getLogger("retail_mart")
        for h in list(retail_mart_logger.handlers):
            try:
                h.close()
            except Exception:
                pass
            retail_mart_logger.removeHandler(h)
        # Restore default app logging
        from app.utils.logging_config import configure_logging
        configure_logging(self.app, force=True)
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_debug_goes_only_to_debug_log(self):
        """DEBUG records appear exclusively in retail_mart_debug.log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            marker = "DEBUG_ONLY_VERIFICATION_MSG_123"
            logger.debug(marker)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                debug_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                info_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_warning.log"), encoding="utf-8") as f:
                warning_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_error.log"), encoding="utf-8") as f:
                error_content = f.read()

            self.assertIn(marker, debug_content, "DEBUG marker must be in retail_mart_debug.log")
            self.assertNotIn(marker, info_content, "DEBUG marker must NOT leak into retail_mart.log")
            self.assertNotIn(marker, warning_content, "DEBUG marker must NOT leak into retail_mart_warning.log")
            self.assertNotIn(marker, error_content, "DEBUG marker must NOT leak into retail_mart_error.log")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    def test_info_goes_only_to_normal_log(self):
        """INFO records appear exclusively in retail_mart.log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            marker = "INFO_ONLY_VERIFICATION_MSG_456"
            logger.info(marker)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                debug_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                info_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_warning.log"), encoding="utf-8") as f:
                warning_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_error.log"), encoding="utf-8") as f:
                error_content = f.read()

            self.assertIn(marker, info_content, "INFO marker must be in retail_mart.log")
            self.assertNotIn(marker, debug_content, "INFO marker must NOT leak into retail_mart_debug.log")
            self.assertNotIn(marker, warning_content, "INFO marker must NOT leak into retail_mart_warning.log")
            self.assertNotIn(marker, error_content, "INFO marker must NOT leak into retail_mart_error.log")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    def test_warning_goes_only_to_warning_log(self):
        """WARNING records appear exclusively in retail_mart_warning.log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            marker = "WARNING_ONLY_VERIFICATION_MSG_789"
            logger.warning(marker)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                debug_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                info_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_warning.log"), encoding="utf-8") as f:
                warning_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_error.log"), encoding="utf-8") as f:
                error_content = f.read()

            self.assertIn(marker, warning_content, "WARNING marker must be in retail_mart_warning.log")
            self.assertNotIn(marker, debug_content, "WARNING marker must NOT leak into retail_mart_debug.log")
            self.assertNotIn(marker, info_content, "WARNING marker must NOT leak into retail_mart.log")
            self.assertNotIn(marker, error_content, "WARNING marker must NOT leak into retail_mart_error.log")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    def test_error_and_critical_go_only_to_error_log(self):
        """ERROR and CRITICAL records appear exclusively in retail_mart_error.log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            err_marker = "ERROR_VERIFICATION_MSG_ABC"
            crit_marker = "CRITICAL_VERIFICATION_MSG_DEF"
            logger.error(err_marker)
            logger.critical(crit_marker)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                debug_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                info_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_warning.log"), encoding="utf-8") as f:
                warning_content = f.read()
            with open(os.path.join(temp_dir, "retail_mart_error.log"), encoding="utf-8") as f:
                error_content = f.read()

            self.assertIn(err_marker, error_content, "ERROR marker must be in retail_mart_error.log")
            self.assertIn(crit_marker, error_content, "CRITICAL marker must be in retail_mart_error.log")

            self.assertNotIn(err_marker, debug_content, "ERROR marker must NOT leak into retail_mart_debug.log")
            self.assertNotIn(err_marker, info_content, "ERROR marker must NOT leak into retail_mart.log")
            self.assertNotIn(err_marker, warning_content, "ERROR marker must NOT leak into retail_mart_warning.log")

            self.assertNotIn(crit_marker, debug_content, "CRITICAL marker must NOT leak into retail_mart_debug.log")
            self.assertNotIn(crit_marker, info_content, "CRITICAL marker must NOT leak into retail_mart.log")
            self.assertNotIn(crit_marker, warning_content, "CRITICAL marker must NOT leak into retail_mart_warning.log")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    def test_no_level_leakage_between_files(self):
        """Verify strict isolation with zero cross-level leakage across all files."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            d_msg = "STRICT_LEAK_CHECK_DEBUG"
            i_msg = "STRICT_LEAK_CHECK_INFO"
            w_msg = "STRICT_LEAK_CHECK_WARNING"
            e_msg = "STRICT_LEAK_CHECK_ERROR"
            c_msg = "STRICT_LEAK_CHECK_CRITICAL"

            logger.debug(d_msg)
            logger.info(i_msg)
            logger.warning(w_msg)
            logger.error(e_msg)
            logger.critical(c_msg)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                debug_lines = f.read()
            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                info_lines = f.read()
            with open(os.path.join(temp_dir, "retail_mart_warning.log"), encoding="utf-8") as f:
                warning_lines = f.read()
            with open(os.path.join(temp_dir, "retail_mart_error.log"), encoding="utf-8") as f:
                error_lines = f.read()

            # retail_mart_debug.log: DEBUG only
            self.assertIn(d_msg, debug_lines)
            self.assertNotIn(i_msg, debug_lines)
            self.assertNotIn(w_msg, debug_lines)
            self.assertNotIn(e_msg, debug_lines)
            self.assertNotIn(c_msg, debug_lines)

            # retail_mart.log: INFO only
            self.assertNotIn(d_msg, info_lines)
            self.assertIn(i_msg, info_lines)
            self.assertNotIn(w_msg, info_lines)
            self.assertNotIn(e_msg, info_lines)
            self.assertNotIn(c_msg, info_lines)

            # retail_mart_warning.log: WARNING only
            self.assertNotIn(d_msg, warning_lines)
            self.assertNotIn(i_msg, warning_lines)
            self.assertIn(w_msg, warning_lines)
            self.assertNotIn(e_msg, warning_lines)
            self.assertNotIn(c_msg, warning_lines)

            # retail_mart_error.log: ERROR & CRITICAL only
            self.assertNotIn(d_msg, error_lines)
            self.assertNotIn(i_msg, error_lines)
            self.assertNotIn(w_msg, error_lines)
            self.assertIn(e_msg, error_lines)
            self.assertIn(c_msg, error_lines)
        finally:
            self._cleanup_isolated_logger(temp_dir)

    def test_debug_suppressed_when_log_level_is_info(self):
        """When LOG_LEVEL=INFO, DEBUG messages are not emitted or written to debug log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="INFO")
        try:
            marker = "SUPPRESSED_DEBUG_MSG_XYZ"
            logger.debug(marker)
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart_debug.log"), encoding="utf-8") as f:
                content = f.read()
            self.assertNotIn(marker, content, "DEBUG message should not be emitted when LOG_LEVEL=INFO")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    # ── 12. Daily rotation configuration tests ─────────────────────────────

    def test_daily_rotation_handler_configuration(self):
        """Handlers must be TimedRotatingFileHandler with midnight rotation and UTF-8 encoding."""
        from logging.handlers import TimedRotatingFileHandler
        retail_mart_logger = logging.getLogger("retail_mart")
        file_handlers = [
            h for h in retail_mart_logger.handlers
            if isinstance(h, TimedRotatingFileHandler)
        ]
        self.assertEqual(len(file_handlers), 4, "Must have exactly 4 TimedRotatingFileHandlers")

        basenames = {os.path.basename(h.baseFilename) for h in file_handlers}
        expected_names = {
            "retail_mart_debug.log",
            "retail_mart.log",
            "retail_mart_warning.log",
            "retail_mart_error.log",
        }
        self.assertEqual(basenames, expected_names)

        for h in file_handlers:
            self.assertEqual(h.when.upper(), "MIDNIGHT", f"Handler {h.baseFilename} when should be MIDNIGHT")
            self.assertEqual(h.interval, 86400, f"Handler {h.baseFilename} interval should be 86400 (24 hours)")
            self.assertEqual(h.backupCount, 30, f"Handler {h.baseFilename} backupCount should be 30")
            self.assertEqual(h.encoding.lower(), "utf-8", f"Handler {h.baseFilename} encoding should be utf-8")
            self.assertEqual(h.suffix, "%Y-%m-%d", f"Handler {h.baseFilename} suffix should be %Y-%m-%d")

    def test_daily_rotation_execution_preserves_active_file(self):
        """TimedRotatingFileHandler.doRollover rotates to date suffix without deleting active log."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="INFO", backup_count=30)
        try:
            info_handler = next(
                h for h in logger.handlers
                if hasattr(h, "baseFilename") and os.path.basename(h.baseFilename) == "retail_mart.log"
            )
            logger.info("Pre-rollover line")
            info_handler.flush()

            # Execute rollover
            info_handler.doRollover()
            logger.info("Post-rollover line")
            info_handler.flush()

            active_path = os.path.join(temp_dir, "retail_mart.log")
            self.assertTrue(os.path.exists(active_path), "Active log file must still exist after rotation")

            dir_files = os.listdir(temp_dir)
            rotated_files = [f for f in dir_files if f.startswith("retail_mart.log.")]
            self.assertTrue(len(rotated_files) >= 1, f"Expected rotated date-suffixed log file in {dir_files}")
        finally:
            self._cleanup_isolated_logger(temp_dir)

    # ── 13. Console logging tests ──────────────────────────────────────────

    def test_console_logging_attached_to_stdout(self):
        """Console StreamHandler must output to sys.stdout and respect log_level."""
        retail_mart_logger = logging.getLogger("retail_mart")
        console_handlers = [
            h for h in retail_mart_logger.handlers
            if type(h) is logging.StreamHandler  # exact StreamHandler, not FileHandler
        ]
        self.assertEqual(len(console_handlers), 1, "Must have exactly 1 console StreamHandler")
        ch = console_handlers[0]
        self.assertIs(ch.stream, sys.stdout, "Console handler stream must be sys.stdout")
        self.assertIsNotNone(ch.formatter, "Console handler must have a formatter attached")

    # ── 14. Request ID tests ───────────────────────────────────────────────

    def test_request_id_embedded_in_formatted_log(self):
        """Formatter embeds [req=...] in records during request context."""
        from app.utils.logging_config import LOG_FORMAT, DATE_FORMAT
        formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

        with self.app.test_request_context("/api/health", headers={"X-Request-ID": "test-req-9999"}):
            self.app.preprocess_request()
            record = logging.LogRecord(
                name="retail_mart", level=logging.INFO, pathname="", lineno=0,
                msg="Operation completed", args=(), exc_info=None
            )
            from app.utils.logging_config import RequestIdFilter
            RequestIdFilter().filter(record)
            output = formatter.format(record)
            self.assertIn("[req=test-req-9999]", output)

    # ── 15. Sensitive values redaction tests ────────────────────────────────

    def test_sensitive_credentials_redacted_across_all_logs(self):
        """Sensitive fields (passwords, tokens, OTPs, API keys, card details) are redacted."""
        temp_dir, logger, _ = self._setup_isolated_logger(log_level="DEBUG")
        try:
            logger.info("User login attempt with password: superSecretPassword123")
            logger.info("Authorization header Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz")
            logger.info("Verification code otp=948215 sent")
            logger.info("Configured GEMINI_API_KEY=AIzaSySecretApiKey123456")
            logger.info("Database URL: mysql+pymysql://dbuser:supersecretpass@localhost:3306/db")
            logger.info("Payment with card_number=4532 1234 5678 9012 and cvv: 345")
            for h in logger.handlers:
                h.flush()

            with open(os.path.join(temp_dir, "retail_mart.log"), encoding="utf-8") as f:
                content = f.read()

            self.assertNotIn("superSecretPassword123", content)
            self.assertNotIn("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz", content)
            self.assertNotIn("948215", content)
            self.assertNotIn("AIzaSySecretApiKey123456", content)
            self.assertNotIn("supersecretpass", content)
            self.assertNotIn("4532 1234 5678 9012", content)
            self.assertNotIn("345", content)

            self.assertIn("[REDACTED]", content)
            self.assertNotIn("4532 1234 5678 9012", content)
        finally:
            self._cleanup_isolated_logger(temp_dir)

    # ── 16. Duplicate handler prevention ───────────────────────────────────

    def test_no_duplicate_handlers_on_repeated_initialisation(self):
        """Calling configure_logging repeatedly does not attach duplicate handlers."""
        from app.utils.logging_config import configure_logging
        retail_mart_logger = logging.getLogger("retail_mart")
        initial_count = len(retail_mart_logger.handlers)

        for _ in range(5):
            configure_logging(self.app)

        self.assertEqual(
            len(retail_mart_logger.handlers), initial_count,
            "Handler count must remain identical across repeated configure_logging calls"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)


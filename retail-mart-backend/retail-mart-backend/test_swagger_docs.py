"""
Automated Unit and Integration Tests for Retail Mart Swagger / OpenAPI Documentation.
Verifies Swagger UI, OpenAPI JSON generation, security definitions, and 100% endpoint coverage.
"""
import unittest
import json
import re
from app import create_app


class TestSwaggerDocumentation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        resp = cls.client.get("/api/docs.json")
        cls.spec_status = resp.status_code
        cls.spec = json.loads(resp.data.decode("utf-8")) if resp.status_code == 200 else {}

    def test_swagger_ui_redirect(self):
        """Verify GET /api/docs redirects cleanly to /api/docs/"""
        resp = self.client.get("/api/docs")
        self.assertIn(resp.status_code, [301, 302, 307, 308])
        self.assertTrue(resp.headers.get("Location", "").endswith("/api/docs/"))

    def test_swagger_ui_html_rendering(self):
        """Verify GET /api/docs/ serves Swagger UI bundle HTML."""
        resp = self.client.get("/api/docs/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/html", resp.content_type)
        html = resp.data.decode("utf-8")
        self.assertIn("SwaggerUIBundle", html)
        self.assertIn("Retail Mart API", html)

    def test_openapi_json_structure(self):
        """Verify GET /api/docs.json returns valid Swagger 2.0 specification."""
        self.assertEqual(self.spec_status, 200)
        self.assertEqual(self.spec.get("swagger"), "2.0")
        self.assertEqual(self.spec.get("info", {}).get("title"), "Retail Mart API")
        self.assertEqual(self.spec.get("info", {}).get("version"), "1.0.0")

    def test_security_definition(self):
        """Verify JWT Bearer security definition is properly configured."""
        security_defs = self.spec.get("securityDefinitions", {})
        self.assertIn("Bearer", security_defs)
        bearer = security_defs["Bearer"]
        self.assertEqual(bearer.get("type"), "apiKey")
        self.assertEqual(bearer.get("name"), "Authorization")
        self.assertEqual(bearer.get("in"), "header")

    def test_tags_present(self):
        """Verify high-level tags are declared in the OpenAPI specification."""
        tags = [t["name"] for t in self.spec.get("tags", [])]
        expected_tags = [
            "Authentication", "Users", "Products", "Categories",
            "Orders", "Payments", "Shipments", "Addresses",
            "Campaigns", "Couriers", "Analytics", "Reports",
            "Dashboard", "Customer Statistics", "Communications",
            "Receipts", "Wishlist", "System"
        ]
        for tag in expected_tags:
            self.assertIn(tag, tags)

    def test_model_definitions_present(self):
        """Verify reusable model definitions exist."""
        definitions = self.spec.get("definitions", {})
        expected_defs = [
            "User", "Product", "Category", "Order", "OrderItem",
            "Payment", "Receipt", "Shipment", "Address", "Campaign",
            "Courier", "WishlistItem", "ErrorResponse"
        ]
        for d in expected_defs:
            self.assertIn(d, definitions, f"Missing definition: {d}")

    def test_full_endpoint_coverage(self):
        """
        Verify that 100% of registered application endpoints (76/76)
        are present and documented in the Swagger specification.
        """
        app_routes = []
        for rule in self.app.url_map.iter_rules():
            # Exclude static assets and Flasgger internals
            if (rule.endpoint == "static" or
                "flasgger" in rule.endpoint or
                rule.rule.startswith("/api/docs") or
                rule.rule in ["/oauth2-redirect.html", "/apidocs/index.html"]):
                continue
            for method in rule.methods:
                if method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    app_routes.append((rule.rule, method))

        swagger_endpoints = set()
        for path, methods in self.spec.get("paths", {}).items():
            for method, details in methods.items():
                if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    swagger_endpoints.add((path, method.upper()))

        missing = []
        for rule_str, method in app_routes:
            swag_path = re.sub(r"<([a-zA-Z_]+:)?([a-zA-Z0-9_]+)>", r"{\2}", rule_str)
            if (swag_path, method) not in swagger_endpoints:
                missing.append((rule_str, swag_path, method))

        self.assertEqual(len(missing), 0, f"Undocumented endpoints found: {missing}")
        self.assertEqual(len(app_routes), 76, f"Expected 76 registered API routes, found {len(app_routes)}")
        self.assertEqual(len(swagger_endpoints), 76, f"Expected 76 documented operations, found {len(swagger_endpoints)}")

    def test_every_operation_has_tags_and_responses(self):
        """Verify that every documented operation has at least one tag and response."""
        for path, methods in self.spec.get("paths", {}).items():
            for method, details in methods.items():
                if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    self.assertTrue(len(details.get("tags", [])) > 0, f"Missing tag on {method.upper()} {path}")
                    self.assertTrue(len(details.get("responses", {})) > 0, f"Missing responses on {method.upper()} {path}")


if __name__ == "__main__":
    unittest.main()

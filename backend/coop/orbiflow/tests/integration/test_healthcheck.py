from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from orbiflow.runtime_info import backend_label, runtime_info


class RuntimeInfoTests(SimpleTestCase):
    @patch.dict("os.environ", {}, clear=True)
    def test_local_defaults(self):
        self.assertEqual(backend_label(), "localhost:8000")
        self.assertEqual(runtime_info(status="ok"), {"status": "ok", "backend": "localhost:8000"})

    @patch.dict(
        "os.environ",
        {
            "RENDER": "true",
            "RENDER_SERVICE_NAME": "orbiflow-backend-sandbox",
        },
        clear=True,
    )
    def test_render_sandbox_env(self):
        self.assertEqual(backend_label(), "orbiflow-backend-sandbox")
        self.assertEqual(
            runtime_info(status="ok"),
            {"status": "ok", "backend": "orbiflow-backend-sandbox"},
        )


class HealthcheckViewTests(TestCase):
    def test_healthcheck_returns_ok_when_database_is_available(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, runtime_info(status="ok"))

    @patch("orbiflow.views.connection.ensure_connection")
    def test_healthcheck_returns_503_when_database_is_unavailable(self, mocked_connect):
        mocked_connect.side_effect = RuntimeError("database is unavailable")

        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 503)
        self.assertJSONEqual(response.content, runtime_info(status="error"))

    @patch.dict(
        "os.environ",
        {
            "RENDER": "true",
            "RENDER_SERVICE_NAME": "orbiflow-backend-sandbox",
        },
        clear=False,
    )
    def test_healthcheck_reports_render_backend(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(
            response.content,
            {"status": "ok", "backend": "orbiflow-backend-sandbox"},
        )

from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from orbiflow.runtime_info import backend_label, deployment, git_branch, neon_branch, runtime_info


class RuntimeInfoTests(SimpleTestCase):
    @patch.dict("os.environ", {"DJANGO_ENV": "local"}, clear=True)
    def test_local_defaults(self):
        self.assertEqual(deployment(), "local")
        self.assertEqual(git_branch(), "local")
        self.assertEqual(neon_branch(), "local")
        self.assertEqual(backend_label(), "localhost:8000")

    @patch.dict("os.environ", {"DJANGO_ENV": "sandbox"}, clear=True)
    def test_local_docker_pointing_to_neon_sandbox(self):
        self.assertEqual(deployment(), "local")
        self.assertEqual(git_branch(), "local")
        self.assertEqual(neon_branch(), "develop")
        self.assertEqual(backend_label(), "localhost:8000")

    @patch.dict(
        "os.environ",
        {
            "DJANGO_ENV": "production",
            "RENDER": "true",
            "RENDER_GIT_BRANCH": "main",
            "RENDER_SERVICE_NAME": "orbiflow-backend-prod",
            "NEON_BRANCH": "main",
        },
        clear=True,
    )
    def test_render_production_env(self):
        self.assertEqual(deployment(), "render")
        self.assertEqual(git_branch(), "main")
        self.assertEqual(neon_branch(), "main")
        self.assertEqual(backend_label(), "orbiflow-backend-prod")

    @patch.dict(
        "os.environ",
        {
            "RENDER": "true",
            "RENDER_GIT_BRANCH": "develop",
            "RENDER_SERVICE_NAME": "orbiflow-backend-sandbox",
            "NEON_BRANCH": "develop",
        },
        clear=True,
    )
    def test_render_sandbox_env(self):
        self.assertEqual(deployment(), "render")
        self.assertEqual(git_branch(), "develop")
        self.assertEqual(backend_label(), "orbiflow-backend-sandbox")


class HealthcheckViewTests(TestCase):
    def test_healthcheck_returns_ok_when_database_is_available(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(
            response.content,
            runtime_info(status="ok", database="connected"),
        )

    @patch("orbiflow.views.connection.ensure_connection")
    def test_healthcheck_returns_503_when_database_is_unavailable(self, mocked_connect):
        mocked_connect.side_effect = RuntimeError("database is unavailable")

        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 503)
        self.assertJSONEqual(
            response.content,
            runtime_info(status="error", database="unavailable"),
        )

    @patch.dict("os.environ", {"DJANGO_ENV": "sandbox"}, clear=False)
    def test_healthcheck_local_docker_with_neon_sandbox(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["deployment"], "local")
        self.assertEqual(payload["git_branch"], "local")
        self.assertEqual(payload["neon_branch"], "develop")
        self.assertEqual(payload["backend"], "localhost:8000")

    @patch.dict(
        "os.environ",
        {
            "RENDER": "true",
            "RENDER_GIT_BRANCH": "main",
            "NEON_BRANCH": "main",
            "RENDER_SERVICE_NAME": "orbiflow-backend-prod",
        },
        clear=False,
    )
    def test_healthcheck_uses_explicit_render_env(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["deployment"], "render")
        self.assertEqual(payload["git_branch"], "main")
        self.assertEqual(payload["neon_branch"], "main")
        self.assertEqual(payload["backend"], "orbiflow-backend-prod")

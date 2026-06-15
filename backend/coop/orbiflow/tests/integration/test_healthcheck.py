from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse


class HealthcheckViewTests(TestCase):
    def test_healthcheck_returns_ok_when_database_is_available(self):
        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(
            response.content,
            {"status": "ok", "database": "connected"},
        )

    @patch("orbiflow.views.connection.ensure_connection")
    def test_healthcheck_returns_503_when_database_is_unavailable(self, mocked_connect):
        mocked_connect.side_effect = RuntimeError("database is unavailable")

        response = self.client.get(reverse("healthcheck"))

        self.assertEqual(response.status_code, 503)
        self.assertJSONEqual(
            response.content,
            {"status": "error", "database": "unavailable"},
        )

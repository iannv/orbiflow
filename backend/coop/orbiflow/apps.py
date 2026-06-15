from django.apps import AppConfig


class OrbiflowConfig(AppConfig):
    name = 'orbiflow'

    def ready(self):
        try:
            from .runtime_info import log_runtime_info

            log_runtime_info()
        except Exception:
            pass


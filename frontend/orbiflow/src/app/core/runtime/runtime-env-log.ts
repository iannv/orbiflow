import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from '../api/api.config';

function safeConsole(
  level: 'info' | 'warn',
  message: string,
  payload?: unknown,
): void {
  try {
    if (level === 'info') {
      console.info(message, payload);
      return;
    }
    console.warn(message, payload);
  } catch {
    // Ignorar: el log de entorno es opcional y no debe afectar la app.
  }
}

export function logRuntimeEnvironment(http: HttpClient): void {
  try {
    http.get(`${API_BASE_URL}/health/`).subscribe({
      next: (info) =>
        safeConsole('info', '[OrbiFlow] Entorno', {
          apiUrl: API_BASE_URL,
          ...info,
        }),
      error: (err) =>
        safeConsole('warn', '[OrbiFlow] No se pudo obtener el entorno', {
          apiUrl: API_BASE_URL,
          reason: 'health_unreachable',
          detail: err?.message ?? err,
        }),
    });
  } catch (err) {
    safeConsole('warn', '[OrbiFlow] No se pudo obtener el entorno', {
      apiUrl: API_BASE_URL,
      reason: 'log_failed',
      detail: err instanceof Error ? err.message : err,
    });
  }
}

import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from '../api/api.config';

interface RuntimeInfo {
  status?: string;
  git_branch?: string | null;
  backend?: string;
}

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

function buildLogPayload(info: RuntimeInfo) {
  return {
    apiUrl: API_BASE_URL,
    backend: info.backend,
    git_branch: info.git_branch,
    status: info.status,
  };
}

export function logRuntimeEnvironment(http: HttpClient): void {
  try {
    http.get<RuntimeInfo>(`${API_BASE_URL}/health/`).subscribe({
      next: (info) =>
        safeConsole('info', '[OrbiFlow] Entorno', buildLogPayload(info)),
      error: (err) =>
        safeConsole('warn', '[OrbiFlow] No se pudo obtener el entorno', {
          apiUrl: API_BASE_URL,
          status: 'error',
          detail: err?.message ?? err,
        }),
    });
  } catch (err) {
    safeConsole('warn', '[OrbiFlow] No se pudo obtener el entorno', {
      apiUrl: API_BASE_URL,
      status: 'error',
      detail: err instanceof Error ? err.message : err,
    });
  }
}

// El backend siempre corre en Docker local (puerto 8000).
// Lo que cambia entre make build-local / build-sandbox / build-prod
// es la base de datos a la que apunta el backend (.env.local / .env.sandbox / .env.prod).
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api'
};

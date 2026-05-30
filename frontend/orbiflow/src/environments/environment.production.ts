// Usado por Vercel al buildear con --configuration=production.
// El servicio orbiflow-backend-prod ya está creado en Render apuntando a la rama main,
// pero recién va a quedar Live cuando se haga el primer merge de develop → main.
export const environment = {
  production: true,
  apiUrl: 'https://orbiflow-backend-prod.onrender.com/api'
};

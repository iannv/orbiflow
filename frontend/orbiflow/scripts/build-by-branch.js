const { execSync } = require('child_process');

// VERCEL_GIT_COMMIT_REF es la variable correcta para Vercel
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'development';
const isProductionBranch = branch === 'main' || branch === 'production';
const target = isProductionBranch ? 'production' : 'sandbox';

console.log(`Building for branch '${branch}' using Angular configuration: ${target}`);

try {
  // Usamos npx para ejecutar el CLI de Angular directamente sin anidar npm run
  execSync(`npx ng build --configuration ${target}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
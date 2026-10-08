import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  /* Correr los tests en paralelo */
  fullyParallel: true,

  /* Falla el build en CI si dejaste un test.only por error */
  forbidOnly: !!process.env.CI,

  /* Reintentos: solo en CI */
  retries: process.env.CI ? 2 : 0,

  /* Workers: uno solo en CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporte HTML (el que se abre en localhost:9323) */
  reporter: 'html',

  use: {
    /* URL base: permite usar rutas cortas en los tests */
    baseURL: 'https://localhost:7250',

    /* Ignora el certificado autofirmado de ASP.NET Core en desarrollo */
    ignoreHTTPSErrors: true,

    /* Graba trace para el Trace Viewer cuando un test falla */
    trace: 'on-first-retry',

    /* Captura screenshot solo si el test falla (sirve como evidencia) */
    screenshot: 'only-on-failure',

    /* Video de cada test — buena evidencia para la carpeta de entregables */
    video: 'on',
    launchOptions: {slowMo: 600}, // Opcional: ralentiza la ejecución para ver mejor lo que pasa
  },

  /* Navegadores contra los que se ejecutan los tests */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
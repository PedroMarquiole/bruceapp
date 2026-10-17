import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta contra o build de produção (vite preview).
 * PLAYWRIGHT_CHROMIUM_PATH aponta para um Chromium já instalado (ambiente da nuvem);
 * sem ela, o Playwright usa o navegador que ele mesmo instalou.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'dark',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

import { defineConfig } from '@playwright/test'
import chromium from '@sparticuz/chromium'

// Bundled Chromium keeps Linux CI and the development sandbox self-contained.
// On macOS/Windows, use Playwright's normal installed Chromium.
const bundled = process.platform === 'linux' && !process.env.PLAYWRIGHT_USE_SYSTEM_BROWSER
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: bundled
      ? {
          args: chromium.args.filter(
            (arg) =>
              ![
                '--single-process',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-site-isolation-trials',
              ].includes(arg),
          ),
          executablePath: await chromium.executablePath(),
        }
      : {},
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  // T15 hygiene pass: every spec file reads/writes the SAME shared, seeded dev Postgres DB
  // (there is no per-test DB isolation for e2e, unlike the throwaway-schema int tests) —
  // several specs mutate real state (checkout.spec.ts and critical-flows.spec.ts both create
  // real confirmed orders that decrement real course-session seat counts; other specs, e.g.
  // course-detail.spec.ts and seo-analytics.spec.ts, assert on those same seat counts as
  // fixed values). Running more than one worker would let files interleave arbitrarily and
  // race those reads against those writes. `workers: 1` makes the whole suite deterministic;
  // each stateful spec is still individually responsible for reseeding itself back to the
  // canonical baseline (see checkout.spec.ts's and critical-flows.spec.ts's `beforeAll`).
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // The event popup (EventPopup.tsx) opens over every page ~2.5s after load and would
    // intercept clicks mid-test. Its documented kill-switch is this localStorage key —
    // pre-seeded here for every test context. Popup-specific tests can clear it.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [{ name: 'isad-event-popup-off', value: '1' }],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

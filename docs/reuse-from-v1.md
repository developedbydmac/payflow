# What to reuse from v1 (payflow-qa)

Taken from the v1 repo on Nov 3, 2026. v1 tested public demo sites (saucedemo.com and fakestoreapi.com) with Cypress as its main suite. v2 tests its own app, with Playwright as the main suite.

## Reuse

| From v1                                                                                                                                                | Use in v2                                                                                                                        | Sprint |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `docs/POSTMORTEM_FLAKY_TEST.md` structure: what we saw, theories considered, what we changed, takeaway                                                 | Template for the flaky-test ADR and any later incident write-up                                                                  | 3      |
| Rule from `docs/CI_CLOUDFLARE_BLOCK.md`: pull the trace before calling a test flaky                                                                    | First line of the flaky-test policy                                                                                              | 3      |
| `playwright.config.ts`: `forbidOnly` on CI, CI retries, `trace: 'on-first-retry'`, screenshot on failure, an API project that never launches a browser | Already in the v2 config. Video recording is dropped because it costs too much in CI.                                            | 1      |
| `config/environments.ts` pattern: named environments and an error for unknown names                                                                    | Environment config in the framework layout                                                                                       | 2      |
| `docs/ARCHITECTURE.md` section 2, the reasons for page objects                                                                                         | Wording for the framework ADR. v2 calls them page components.                                                                    | 2      |
| `docs/ARCHITECTURE.md` section 1, the Playwright advantages (multiple origins, WebKit, the shared `request` fixture)                                   | Arguments for the Playwright vs. Cypress ADR, with the conclusion reversed: Playwright is now the main suite                     | 5      |
| `scripts/generate-report.js`: groups results by risk area                                                                                              | Starting point for the coverage-by-risk script. Map risks with tags such as `@risk:refunds` instead of guessing from file names. | 3      |
| The v1 Cypress specs (login, cart, checkout, sorting, order integrity)                                                                                 | Model for the five Cypress smoke flows: create, capture, refund, list, and checkout UI                                           | 5      |
| `performance/checkout-load.js` (k6)                                                                                                                    | Starting shape for the k6 smoke script, pointed at the v2 API                                                                    | 4      |

## Leave behind

- Public demo targets, along with the Cloudflare workarounds and empty-body workarounds they needed. v2 owns its app, so those failures can't happen.
- `eventflow-staging/`, including its Python `main.py`. That's a separate project, and v2 uses no Python.
- `docs/AI_ASSISTED_TESTING.md`. AI-era QA belongs in HoopTapes.
- `video: 'on'`.

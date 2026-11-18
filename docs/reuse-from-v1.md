# What to reuse from the earlier PayFlow (payflow-qa)

Taken from the earlier repo on Nov 3, 2026, and re-mapped to the v1.0.0 plan on Nov 17. The earlier version tested public demo sites (saucedemo.com and fakestoreapi.com) with Cypress as its main suite. This version tests its own app, with Playwright as the main suite.

## Reuse

| From the earlier repo                                                                                                                 | Use here                                                                                                                         | Week |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `docs/POSTMORTEM_FLAKY_TEST.md` structure: what we saw, theories considered, what we changed, takeaway                                | Template for the flaky-test postmortem                                                                                           | 5    |
| Rule from `docs/CI_CLOUDFLARE_BLOCK.md`: pull the trace before calling a test flaky                                                   | First line of the flaky-test policy (ADR 0002)                                                                                   | 2    |
| `playwright.config.ts`: `forbidOnly` on CI, trace on first retry, screenshot on failure, an API project that never launches a browser | Already in the config. Video recording is dropped because it costs too much in CI.                                               | 1    |
| `config/environments.ts` pattern: named environments and an error for unknown names                                                   | `framework/config/`                                                                                                              | 1    |
| `docs/ARCHITECTURE.md` section 2, the reasons for page objects                                                                        | Wording for the page components in `framework/components/`                                                                       | 3    |
| `scripts/generate-report.js`: groups results by risk area                                                                             | Starting point for the coverage-by-risk script. Map risks with tags such as `@risk:refunds` instead of guessing from file names. | 5    |

## Leave behind

- Public demo targets, along with the Cloudflare and empty-body workarounds they needed. This app is ours, so those failures can't happen.
- The Cypress suite and the Cypress-first reasoning. Cypress is not part of v1.
- `performance/checkout-load.js` (k6). Load testing is planned for a separate project.
- `eventflow-staging/`, including its Python `main.py`.
- `docs/AI_ASSISTED_TESTING.md`.
- `video: 'on'`.

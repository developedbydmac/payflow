# ADR 0001: Stack and repo

- **Status:** Accepted (revised 2026-11-17)
- **Date:** 2026-11-03

## Context

The earlier PayFlow (`payflow-qa`) tested public demo sites, with Cypress as its main suite. Its CI failures came from third-party behavior, such as Cloudflare challenges and empty `200` responses, rather than from the code under test. The rebuild needs a system under test that it controls, including its database.

## Decision

- Build a small payments app inside this repo, so the tests own the system under test from end to end.
- Use TypeScript everywhere: Playwright for API and UI tests, and Vitest for ledger unit tests. Cypress is not part of v1.
- Run Postgres in Docker Compose. Run CI on GitHub Actions.
- Build in a new repo while the earlier one stays on resumes. At v1.0.0 (Dec 20, 2026), rename the earlier repo to `payflow-legacy` and this repo to `payflow`.

## Consequences

- Every failure points at our own code, so tests can assert database state directly.
- The app is a prop, with about 6 hours in total. Its features freeze on Nov 21, 2026.
- Scope freezes at v1.0.0. Anything unfinished moves to a separate project, not into January.

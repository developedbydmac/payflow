# ADR 0001: Stack and repo

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

PayFlow v1 (`payflow-qa`) tested public demo sites, with Cypress as its main suite. Its CI failures came from third-party behavior, such as Cloudflare challenges and empty `200` responses, rather than from the code under test. v2 needs a system under test that it controls, including its database.

## Decision

- Build a small payments app inside this repo, so the tests own the system under test from end to end.
- Use TypeScript everywhere. Playwright is the main framework, with a small Cypress suite kept for comparison.
- Run Postgres in Docker Compose. Run CI on GitHub Actions.
- Build in the public `developedbydmac/payflow` repo. At the swap, rename v1 to `payflow-qa-v1` and this repo to `payflow-qa`, so existing links keep working.

## Consequences

- Every failure points at our own code, so tests can assert database state directly.
- The app is a prop, with about 8 hours in total. Its features are frozen after Sprint 1.
- The repo is public while unfinished. The README says so.

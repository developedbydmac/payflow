# PayFlow

**A QA automation project built around a small payments app, made to be tested the way a real payments team would test.**

> **Status: in active development (Nov 2026 – Jan 2027).** This README lists only what exists in the repo today. Planned work is marked as planned.

## Why this project exists

Payments are where quality failures cost the most: charging twice, refunding more than was captured, or a ledger that disagrees with what the customer sees. PayFlow is a deliberately small payments API and UI, with a full test framework built around it.

The previous version of PayFlow tested public demo sites. Its hardest failures came from third-party behavior the tests could not control, such as bot-protection challenges on CI runners and inconsistent API responses. This rebuild owns its system under test from end to end, down to the database, so every failure points at real code. The reasoning is in [ADR 0001](docs/adr/0001-stack-and-repo.md).

## What exists today

- **App spec** ([docs/spec.md](docs/spec.md)): four payment endpoints (create, capture, refund, list), idempotency rules, a payment status flow, an append-only ledger, and four ledger rules the database tests will check.
- **Framework setup:** TypeScript (strict), Playwright with separate `api` and `ui` projects, ESLint and Prettier.
- **Decision records** ([docs/adr/](docs/adr/)): why the project is built this way.
- **Lessons carried over from v1** ([docs/reuse-from-v1.md](docs/reuse-from-v1.md)): what was kept from the first version, and what was left behind.

## Stack

TypeScript · Playwright · Node/Express · PostgreSQL · Docker Compose · GitHub Actions

## Roadmap (planned)

| Target    | Milestone                                                                                |
| --------- | ---------------------------------------------------------------------------------------- |
| Mid-Nov   | Payments API and Postgres ledger; checkout and dashboard pages; one-command Docker setup |
| Late Nov  | Framework core: fixtures, API client, data factories, database assertions on the ledger  |
| Mid-Dec   | GitHub Actions CI with sharding, merged reports, flaky-test policy, risk-based coverage  |
| Late Dec  | Performance (k6), accessibility (axe) and security (OWASP ZAP) checks in CI              |
| Early Jan | Contract tests from an OpenAPI spec; BDD scenarios; Cypress comparison suite             |
| Mid-Jan   | Seeded-bug demo showing which test catches each defect; walkthrough video                |

## Run it

```bash
npm install
npm run check   # lint, typecheck and format check
```

App and test commands will be added here as each piece lands.

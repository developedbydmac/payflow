# PayFlow

**A QA automation project built around a small payments app, made to be tested the way a real payments team would test.**

> **Status: in active development. v1.0.0 is planned for Dec 20, 2026.** This README lists only what exists in the repo today. Planned work is marked as planned.

## Why this project exists

Payments are where quality failures cost the most: charging twice, refunding more than was captured, one customer seeing another customer's payment, or a ledger that disagrees with what the customer sees. PayFlow is a deliberately small payments API and UI, with a test framework built around it. The app is a prop. The framework, pipeline and risk model are the product.

The earlier version of PayFlow tested public demo sites. Its hardest failures came from third-party behavior the tests could not control, such as bot-protection challenges on CI runners and inconsistent API responses. This rebuild owns its system under test from end to end, down to the database, so every failure points at real code. The reasoning is in [ADR 0001](docs/adr/0001-stack-and-repo.md).

## What exists today

- **App spec** ([docs/spec.md](docs/spec.md)): four payment endpoints, two users who own their payments, required idempotency keys, a fake payment processor, an append-only ledger, and the five ledger rules the database tests will assert.
- **Framework setup:** TypeScript (strict), Playwright with separate `api` and `ui` projects, ESLint and Prettier.
- **Decision records** ([docs/adr/](docs/adr/)): why the project is built this way.

## Stack

TypeScript · Playwright · Vitest · Node/Express · PostgreSQL · Docker Compose · GitHub Actions

## Roadmap to v1.0.0 (planned)

| Target | Milestone                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Nov 22 | Payments API, Postgres ledger and token auth; one-command Docker Compose start; framework core and the first API test    |
| Nov 29 | API tests for lifecycle, validation, auth, idempotency, refund limits and authorization; first CI run; flaky-test policy |
| Dec 6  | Checkout and dashboard UI tests; SQL assertions on the ledger; concurrent same-key test; risk register                   |
| Dec 13 | CI on every PR with tags, 4 shards, one merged report, branch protection and a Gitleaks secret scan                      |
| Dec 20 | Money edge-case tests, coverage-by-risk report, test strategy, walkthrough video; v1.0.0                                 |

## Run it

Needs Node 22+ and Docker.

```bash
npm install
npm run db:up      # start Postgres 16 in Docker
npm run db:reset   # create the tables and load the seed data (2 users, 10 payments)
npm run check      # lint, typecheck and format check
```

App and test commands will be added here as each piece lands.

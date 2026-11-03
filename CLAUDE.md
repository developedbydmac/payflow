# PayFlow: notes for Claude Code

PayFlow is a QA portfolio project: a tiny payments app (`app/`) that exists to be tested, plus a Playwright framework (`tests/`). The quality of the tests is the product. The app is a prop.

## Rules

- The stack is TypeScript only: Node/Express, Postgres, Playwright, a small Cypress suite later, Docker and GitHub Actions. **No Python and no Pytest.**
- `docs/spec.md` is the source of truth for the app. Don't add app features beyond it. App features are frozen after Sprint 1 (Nov 15, 2026).
- Keep AI, LLM-eval and agent testing out of this repo. That work belongs in HoopTapes.
- Never claim a feature or a test count in the README or docs unless it exists and passes.
- Every interactive UI element gets a `data-testid`. Tests use `data-testid` or role locators, never CSS chains.
- Record decisions as numbered ADRs in `docs/adr/` (`NNNN-title.md`).
- Tags: `@smoke` for the post-deploy suite and `@regression` for everything else. Later: `@quarantine` and `@risk:<area>`.

## Commands

- `npm run check`: lint, typecheck, then the format check. Run it before every commit.
- `npm test`: run all tests. Also `npm run test:api` and `npm run test:ui`.
- `BASE_URL` sets the app under test. It defaults to `http://localhost:3000`.

## Working style

The owner works in 2-hour sessions. Keep each change small enough to commit at the end of a session, and commit and push even if the work is half done.

# Dev log

Three lines per session: what I did, what surprised me, what's next.

## 2026-11-03

- **Did:** scaffolded the repo (TypeScript, Playwright, ESLint, Prettier), drafted the app spec, listed what to reuse from the earlier PayFlow.
- **Surprised:** the earlier repo's hardest bugs were all third-party behavior (a Cloudflare challenge, empty 200 responses), which is the best argument for owning the system under test.
- **Next:** align with the v1 plan, then the schema and seed data.

## 2026-11-17

- **Did:** aligned the repo with the v1 plan (Dec 20 scope): two users who own their payments, token auth, required idempotency keys, a fake processor, money rules; updated the README roadmap and ADR 0001.
- **Surprised:** _(fill in)_
- **Next:** Postgres schema and seed data with two users. Done when the seed loads.

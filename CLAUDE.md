# CLAUDE.md

## Commands

- Install dependencies: `npm install`
- Run tests: `npm test`
- Type-check/build: `npm run build`
- Lint: `npm run lint`

## Workflow rules

- Do not push changes unless explicitly asked.
- Do not use `--no-verify`.
- Do not run destructive git commands such as `git reset --hard`, `git clean -fd`, or force-push without confirmation.
- Keep diffs focused on the requested behavior.
- Add or update tests when changing business rules.
- Before finishing, report the exact commands run and their results.

## Architecture notes

- Route handlers should stay thin and delegate business decisions to services.
- Services own status transitions, refund rules, and inventory side effects.
- Repositories are in-memory for this Greenfield; do not add a database unless asked.
- Preserve tenant boundaries whenever adding lookup/reporting behavior.
- Treat money as integer cents.

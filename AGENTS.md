# OpenMAIC Agent Instructions

Always respond in Chinese-simplified.

## Environment

- Host development environment: macOS with zsh unless a newer user message says otherwise.
- Node.js is managed by Volta. Respect the `volta` field in `package.json`.
- Required runtime versions:
  - Node.js >= 20.9.0
  - pnpm >= 10
- Prefer `pnpm` for package scripts and dependency operations.

## Local Development

- Docker is the preferred way to run the project locally.
- Use `docker compose -f docker-compose.dev.yml up --build` for the local development server.
- Use `docker compose up --build` for the production-style standalone container.
- Do not commit `.env.local` or `server-providers.yml`; they contain local secrets.

## Provider Access

- The project supports OpenAI-compatible providers through the shared provider layer.
- Doubao is configured as provider ID `doubao` and uses the OpenAI-compatible protocol.
- Server-side Doubao configuration uses:
  - `DOUBAO_API_KEY`
  - `DOUBAO_BASE_URL`
  - `DOUBAO_MODELS`
- The expected local default model is `DEFAULT_MODEL=doubao:ep-20260225155849-krdlt`.

## Work Rules

- Follow the lifecycle: INIT -> ANALYSIS -> EXECUTION -> COMPLETED, or FAILED/ABORTED when blocked.
- Read existing code and project rules before editing.
- Keep changes scoped, reviewable, and verifiable.
- Treat the official repository branch `upstream/main` as the source for mainline merges. Do not substitute `origin/main` unless a user explicitly requests it.
- When changing functionality, update `docs/UPSTREAM_SYNC_GUIDE.md` in the same change. Document the affected custom behavior, likely conflict files, required preservation or compatibility rules, and relevant verification steps so that `upstream/main` can continue to be merged safely into the current branch.
- For functionality changes, run the relevant tests and `pnpm exec tsc --noEmit`. Also run `pnpm lint` and `pnpm build` when the affected scope or risk warrants full-project verification. Record any check that could not be run and why.
- Do not expose secrets in logs, commits, documentation examples, or generated files.
- Documentation-only requests must not silently change runtime behavior.

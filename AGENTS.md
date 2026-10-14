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
- Alibaba Cloud Bailian is configured as provider ID `qwen` and uses the OpenAI-compatible protocol.
- Server-side Bailian configuration uses:
  - `QWEN_API_KEY`
  - `QWEN_BASE_URL`
  - `QWEN_MODELS`
- The expected local default model is `DEFAULT_MODEL=qwen:qwen3.7-flash`.
- Local deployments configure only QWEN LLM, image and TTS providers through `.env.local`.
- Keep `.env.example` and deployment examples limited to QWEN; do not configure or mount `server-providers.yml` for this deployment.
- Preserve the shared provider implementations and settings UI for compatibility.

## Work Rules

- Follow the lifecycle: INIT -> ANALYSIS -> EXECUTION -> COMPLETED, or FAILED/ABORTED when blocked.
- Read existing code and project rules before editing.
- Keep changes scoped, reviewable, and verifiable.
- Treat the official repository branch `upstream/main` as the source for mainline merges. Do not substitute `origin/main` unless a user explicitly requests it.
- When changing functionality, update `docs/UPSTREAM_SYNC_GUIDE.md` in the same change. Document the affected custom behavior, likely conflict files, required preservation or compatibility rules, and relevant verification steps so that `upstream/main` can continue to be merged safely into the current branch.
- For functionality changes, run the relevant tests and `pnpm exec tsc --noEmit`. Also run `pnpm lint` and `pnpm build` when the affected scope or risk warrants full-project verification. Record any check that could not be run and why.
- Do not expose secrets in logs, commits, documentation examples, or generated files.
- Documentation-only requests must not silently change runtime behavior.

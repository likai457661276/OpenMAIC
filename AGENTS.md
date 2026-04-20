# OpenMAIC Agent Instructions

Always respond in Chinese-simplified.

## Environment

- Host development environment: macOS with zsh unless a newer user message says otherwise.
- Node.js is managed by Volta. Respect the `volta` field in `package.json`.
- Required runtime versions:
  - Node.js >= 20
  - pnpm >= 10
- Prefer `pnpm` for package scripts and dependency operations.

## Local Development

- Docker is the preferred way to run the project locally.
- Use `docker compose -f docker-compose.dev.yml up --build` for the local development server.
- Use `docker compose up --build` for the production-style standalone container.
- Do not commit `.env.local` or `server-providers.yml`; they contain local secrets.

## Provider Access

- The project supports OpenAI-compatible providers through the shared provider layer.
- SiliconFlow is configured as provider ID `siliconflow` and uses the OpenAI-compatible protocol.
- Server-side SiliconFlow configuration uses:
  - `SILICONFLOW_API_KEY`
  - `SILICONFLOW_BASE_URL`
  - `SILICONFLOW_MODELS`
- The expected local default model is `DEFAULT_MODEL=siliconflow:Pro/MiniMaxAI/MiniMax-M2.5`.

## Work Rules

- Follow the lifecycle: INIT -> ANALYSIS -> EXECUTION -> COMPLETED, or FAILED/ABORTED when blocked.
- Read existing code and project rules before editing.
- Keep changes scoped, reviewable, and verifiable.
- Do not expose secrets in logs, commits, documentation examples, or generated files.
- Documentation-only requests must not silently change runtime behavior.

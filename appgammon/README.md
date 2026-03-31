# AppGammon

AppGammon is a backgammon app with a React Native/Expo client, a Hono backend, and shared gameplay rules in a common package.

## Setup

1. Install dependencies with `pnpm install`.
2. Start Postgres with `just db-up`.
3. Run migrations with `just db-migrate`.
4. Start the monorepo in dev mode with `pnpm dev` or `just`.

Useful commands:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `just db-down`
- `just db-reset`

## Acknowledgements

These tools helped build parts of this codebase:

- [Claude Code](https://github.com/anthropics/claude-code) (Anthropic, 2026. `claude-opus-4-6`, `claude-sonnet-4-6`)
- [Codex](https://github.com/openai/codex) (OpenAI, 2026. `gpt-5.4`)

# Backgammon game UI

Props-driven UI for in-game play: board (24 points + bar), dice, doubling cube, emotes, and match score. Game logic and server sync are **not** implemented here—the screen uses mock state until the backend exposes game state.

## Layout

| Area | Location |
|------|----------|
| Types & mock state | `apps/mobile/types/game.ts` |
| Board pieces | `components/game/checker.tsx`, `point.tsx`, `bar.tsx`, `backgammon-board.tsx` |
| Controls | `dice-display.tsx`, `doubling-cube.tsx`, `emote-area.tsx` |
| Composition | `components/game/game-ui.tsx` |
| Screen | `app/game.tsx` |

Host navigates with `isHost` from lobby → **white**; guest → **red**.

## Run locally

1. **PostgreSQL** — e.g. `docker compose up -d` from `apps/server/docker`, then `pnpm db:migrate` in `apps/server`.
2. **API** — `apps/server`: `pnpm dev` (port **3000**).
3. **Mobile** — `apps/mobile`: `pnpm exec expo start --localhost` (simulator-friendly). Use **`pnpm exec expo start --lan`** if testing on a physical device and set `EXPO_PUBLIC_API_URL` to your Mac’s LAN IP.

Avoid duplicate servers on port 3000. For two simulators, install **Expo Go** on each (or use **web** at `http://localhost:8081` for a second player).

## Related changes

- `SafeAreaProvider` + `SafeAreaView` from `react-native-safe-area-context` (replaces deprecated RN `SafeAreaView`).
- `package.json` `ios` script: `expo start --ios --localhost` to reduce simulator connection timeouts.

# Backgammon Backend Implementation Plan

## Context

The app has a working session management system (create/join/start/cancel with SSE) but **no game logic**. The game screen currently uses `MOCK_GAME_STATE`. This plan implements the full backgammon backend: game engine, database tables, API endpoints, and real-time SSE events for multiplayer play with best-of-N series and doubling cube.

---

## Phase 1: Game Engine (`packages/common`)

Pure TypeScript, no server dependencies. All new files in `packages/common/`.

### 1.1 `packages/common/game-types.ts` — Types & constants
- Canonical server types: `Board` (number[24], signed ints), `Bar`, `BorneOff`, `Dice`, `DiceUsed`, `TurnPhase`, `GameStatus`, `SeriesStatus`, `Move { from, to }`, `PlayerRole`
- `INITIAL_BOARD` as signed int array: `[2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5, -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2]`
- `GameState` interface (what the server stores/returns)
- `SeriesState` interface
- `GameEventType`: `"game_state" | "emote" | "double_proposed" | "double_accepted" | "double_declined" | "game_over" | "series_complete"`
- Conversion helper: `signedBoardToPointState()` and `pointStateToSignedBoard()` to bridge with mobile's `PointState[]` format

### 1.2 `packages/common/dice.ts` — Dice utilities
- `rollDice(): [number, number]`
- `rollSingleDie(): number`
- `initializeDiceUsed(dice): boolean[]` — length 2 normally, 4 for doubles
- `getAvailableDice(dice, diceUsed): number[]`

### 1.3 `packages/common/board.ts` — Board utilities
- `getDirection(playerRole): 1 | -1` — player1 moves 0→23, player2 moves 23→0
- `isBlocked(board, pointIndex, playerRole): boolean` — opponent has 2+
- `getHomeRange(playerRole): [start, end]` — player1: 18-23, player2: 0-5
- `allCheckersInHome(board, bar, playerRole): boolean`
- `applyMove(board, bar, borneOff, move, playerRole): { board, bar, borneOff }` — handles hitting

### 1.4 `packages/common/move-validation.ts` — Single-move validation
- `getValidMoves(board, bar, borneOff, playerRole, dieValue): Move[]` — all legal destinations for one die
- `validateMove(board, bar, borneOff, move, playerRole, dieValue): { valid, error? }`
- Handles: bar re-entry first, normal moves, bearing off (exact + overshoot rules)

### 1.5 `packages/common/turn-validation.ts` — Full turn validation (most complex)
- `validateTurn(state, moves, playerRole): { valid, newBoard, newBar, newBorneOff, diceUsed, error? }`
- `generateAllLegalTurns(board, bar, borneOff, dice, playerRole): Move[][]` — DFS over all move orderings, returns maximal-length sequences
- `hasAnyLegalMove(board, bar, borneOff, dice, playerRole): boolean`
- Enforces must-use-maximum-dice rule (if only one die usable, must use larger)

### 1.6 `packages/common/win-detection.ts`
- `checkWin(borneOff, playerRole): boolean` — 15 checkers borne off
- `calculateGamePoints(board, bar, borneOff, winnerRole, cubeValue): number` — 1/gammon(2x)/backgammon(3x)
- `checkSeriesComplete(p1Score, p2Score, bestOf): { complete, winnerRole? }`

### 1.7 Update `packages/common/index.ts`
- Re-export all new modules alongside existing session exports

---

## Phase 2: Database Schema

### 2.1 Update `apps/server/db/schema.ts`
Add three tables (using existing patterns — `uuid().defaultRandom().primaryKey()`, `timestamp().defaultNow()`, FK refs):

**`series`**: id (uuid PK), session_id (FK sessions), best_of (integer), player1_score (int default 0), player2_score (int default 0), status (text default "active"), winner_id (uuid FK nullable), created_at

**`games`**: id (uuid PK), series_id (FK series), board (jsonb), bar (jsonb), borne_off (jsonb), current_turn (uuid FK players), turn_phase (text), dice (jsonb nullable), dice_used (jsonb nullable), doubling_cube (int default 1), cube_owner (uuid FK nullable), version (int default 1), status (text default "in_progress"), winner_id (uuid FK nullable), created_at, updated_at

**`moves`**: id (uuid PK), game_id (FK games), player_id (FK players), move_number (int), action_type (text), action_data (jsonb), created_at

Need to import `integer, jsonb` from `drizzle-orm/pg-core`.

### 2.2 Generate & run migration
- `pnpm db:generate` then `pnpm db:migrate`

---

## Phase 3: Server Infrastructure

### 3.1 `apps/server/middleware/auth.ts` — Extract shared auth
Move `authenticateRequest` from `session-controller.ts` into a shared middleware file. Both session and game controllers will import it. Keep the same logic (Bearer token + X-Device-Id + session ID verification).

### 3.2 `apps/server/utils/game-events.ts` — Game SSE pub/sub
Same pattern as `session-events.ts` but with game-specific events:
```ts
interface GameEvent {
  type: GameEventType;
  data: unknown;
  forPlayer?: string;  // targeted delivery (e.g. double_proposed only to opponent)
}
```

### 3.3 `apps/server/schemas/game.ts` — Zod validation
- `startSeriesSchema`: `{ best_of: z.union([z.literal(3), z.literal(5), z.literal(7)]) }`
- `submitMovesSchema`: `{ game_id: z.string().uuid(), version: z.number().int(), moves: z.array(z.object({ from: z.number(), to: z.number() })) }`
- `doubleActionSchema`: `z.enum(["propose", "accept", "decline"])`
- `emoteIdSchema`: `z.enum(["thumbs_up", "gg", "oops", "thinking", "nice_move"])`

---

## Phase 4: Game Service (`apps/server/services/game-service.ts`)

### 4.1 `startSeries(sessionId, player1Id, player2Id, bestOf)`
1. Insert `series` row
2. Roll opening dice (1 die each, re-roll on ties) to determine first player
3. Create first `games` row with INITIAL_BOARD, dice = opening roll, current_turn = winner, turn_phase = "moving"
4. Return full series + game state

### 4.2 `getSeriesState(sessionId, playerId)`
1. Query series by session_id, join active game
2. Return series state with `is_your_turn` computed from playerId

### 4.3 `submitMoves(gameId, playerId, version, moves)`
1. Load game, verify version (optimistic lock → 409 on mismatch), verify current_turn, verify turn_phase = "moving"
2. Determine playerRole from session's player1/player2
3. Call `validateTurn()` from common package
4. If invalid → 422
5. Apply: update game row (board, bar, borne_off, dice_used), increment version, log moves
6. Check win → if won: calculate points, update series scores, check series complete, start next game if needed
7. If not won: switch turn, auto-roll dice, check for legal moves (auto-pass if none)
8. Publish `game_state` SSE event

### 4.4 `proposeDouble(gameId, playerId)`
- Verify turn, phase = "waiting_for_roll_or_double", cube eligibility
- Set turn_phase = "double_proposed", publish `double_proposed` to opponent

### 4.5 `respondToDouble(gameId, playerId, action)`
- Accept: double cube, set cube_owner = acceptor, auto-roll, set phase = "moving", publish `double_accepted`
- Decline: forfeit game at current cube value, update scores, start next game if series continues, publish `double_declined` + `game_over`

### 4.6 `sendEmote(sessionId, playerId, emoteId)`
- In-memory rate limit: `Map<string, number>` (playerId → last timestamp), reject if < 3s
- Publish ephemeral `emote` event via SSE

---

## Phase 5: Game Controller (`apps/server/controllers/game-controller.ts`)

### 5.1 RPC routes (`gameRoutes`)
Follow session controller pattern (Hono instance, sValidator, authenticateRequest):
- `POST /series/start` — body: `{ best_of }`, host-only auth → `gameService.startSeries()`
- `GET /sync` — auth required → `gameService.getSeriesState()`
- `PUT /board-state` — body: `{ game_id, version, moves }` → `gameService.submitMoves()`
- `POST /double` — query: `?action=propose|accept|decline` → route to propose/respond
- `POST /emote` — query: `?id=<emoteId>` → `gameService.sendEmote()`

### 5.2 SSE controller (`gameSSEController`)
Separate Hono instance (same pattern as `sessionSSEController`):
- `GET /events` — auth required, send initial `game_state`, subscribe to game-events pub/sub, filter `forPlayer` events, keepalive loop

### 5.3 Update `apps/server/app.ts`
```ts
const routes = app
  .route("/sessions", sessionRoutes)
  .route("/games", gameRoutes);
app.route("/sessions", sessionSSEController);
app.route("/games", gameSSEController);
```

---

## Phase 6: Refactor session-controller.ts
- Import `authenticateRequest` from new `middleware/auth.ts` instead of local definition
- Remove duplicated auth function

---

## Implementation Order

| Step | Files | Description |
|------|-------|-------------|
| 1 | `packages/common/game-types.ts` | Types, constants, board conversion |
| 2 | `packages/common/dice.ts` | Dice rolling & tracking |
| 3 | `packages/common/board.ts` | Board utilities |
| 4 | `packages/common/move-validation.ts` | Single-move validation |
| 5 | `packages/common/turn-validation.ts` | Full turn validation + must-use-max |
| 6 | `packages/common/win-detection.ts` | Win check & scoring |
| 7 | `packages/common/index.ts` | Re-export all |
| 8 | `apps/server/db/schema.ts` | Add series/games/moves tables |
| 9 | Migration | `pnpm db:generate && pnpm db:migrate` |
| 10 | `apps/server/schemas/game.ts` | Zod request schemas |
| 11 | `apps/server/utils/game-events.ts` | Game SSE pub/sub |
| 12 | `apps/server/middleware/auth.ts` | Extract shared auth |
| 13 | `apps/server/services/game-service.ts` | All game business logic |
| 14 | `apps/server/controllers/game-controller.ts` | HTTP routes + SSE |
| 15 | `apps/server/app.ts` | Register new routes |
| 16 | `apps/server/controllers/session-controller.ts` | Use shared auth import |

---

## Key Design Decisions

- **Board format**: Server uses signed int array (spec-compliant, simpler engine logic). Conversion functions bridge to mobile's `PointState[]` format.
- **Auto-roll**: No explicit "roll" endpoint. Dice auto-roll when turn switches. `turn_phase` goes to "moving" directly unless player can propose a double.
- **Optimistic locking**: Client sends `version` with moves; server rejects on mismatch (409).
- **SSE targeting**: `forPlayer` field on game events enables targeted delivery (e.g. double proposal only to opponent).
- **Turn phase for doubling**: When `canProposeDouble` is true, phase starts at "waiting_for_roll_or_double" (dice not yet rolled). Otherwise goes straight to "moving" with dice pre-rolled.

---

## Verification

1. **Schema**: Run `pnpm db:generate` and `pnpm db:migrate` — verify tables created
2. **Unit tests**: Write vitest tests in `packages/common/` for move validation, turn validation (especially must-use-max-dice), win detection, bearing off edge cases
3. **Integration**: Use `pnpm dev` to start server, test with curl/httpie:
   - Create session → join → start → start series
   - GET /games/sync to see initial board state
   - PUT /games/board-state with moves
   - SSE stream at /games/events to verify real-time updates
4. **Edge cases to test**: doubles (4 moves), bar re-entry, bearing off overshoot, gammon/backgammon scoring, double propose/accept/decline, emote rate limiting

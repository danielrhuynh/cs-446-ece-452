/**
 * Game service — business logic for backgammon gameplay.
 * Handles series lifecycle, move submission, doubling cube, and emotes.
 */

import {
  INITIAL_BOARD,
  INITIAL_BAR,
  INITIAL_BORNE_OFF,
  rollDice,
  rollSingleDie,
  initializeDiceUsed,
  validateTurn,
  hasAnyLegalMove,
  checkWin,
  calculateGamePoints,
  checkSeriesComplete,
  type Board,
  type Bar,
  type BorneOff,
  type Dice,
  type DiceUsed,
  type Move,
  type PlayerRole,
  type GameState,
  type SeriesState,
} from "@appgammon/common";
import { db } from "../db/client";
import { series, games, moves, sessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { publishGame } from "../utils/game-events";

// ── Emote rate limiting (in-memory) ──

const lastEmoteTimestamp = new Map<string, number>();
const EMOTE_COOLDOWN_MS = 3000;

// ── Helpers ──

function getPlayerRole(playerId: string, player1Id: string): PlayerRole {
  return playerId === player1Id ? "player1" : "player2";
}

function getOpponentId(playerId: string, player1Id: string, player2Id: string): string {
  return playerId === player1Id ? player2Id : player1Id;
}

async function getSessionPlayers(sessionId: string): Promise<{ player1Id: string; player2Id: string } | null> {
  const [session] = await db
    .select({ player_1_id: sessions.player_1_id, player_2_id: sessions.player_2_id })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session || !session.player_2_id) return null;
  return { player1Id: session.player_1_id, player2Id: session.player_2_id };
}

async function getActiveGame(seriesId: string) {
  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.series_id, seriesId), eq(games.status, "in_progress")))
    .limit(1);
  return game ?? null;
}

async function getActiveSeries(sessionId: string) {
  const [s] = await db
    .select()
    .from(series)
    .where(and(eq(series.session_id, sessionId), eq(series.status, "active")))
    .limit(1);
  return s ?? null;
}

function gameRowToState(game: typeof games.$inferSelect): GameState {
  return {
    id: game.id,
    seriesId: game.series_id,
    board: game.board as Board,
    bar: game.bar as Bar,
    borneOff: game.borne_off as BorneOff,
    currentTurn: game.current_turn,
    turnPhase: game.turn_phase as GameState["turnPhase"],
    dice: game.dice as Dice | null,
    diceUsed: game.dice_used as DiceUsed | null,
    doublingCube: game.doubling_cube,
    cubeOwner: game.cube_owner,
    version: game.version,
    status: game.status as GameState["status"],
    winnerId: game.winner_id,
  };
}

function seriesToState(s: typeof series.$inferSelect, currentGame: GameState | null): SeriesState {
  return {
    id: s.id,
    sessionId: s.session_id,
    bestOf: s.best_of,
    player1Score: s.player1_score,
    player2Score: s.player2_score,
    status: s.status as SeriesState["status"],
    winnerId: s.winner_id,
    currentGame,
  };
}

/** Create a new game within a series. Rolls dice and determines first player. */
async function createNewGame(
  seriesId: string,
  player1Id: string,
  player2Id: string,
): Promise<GameState> {
  // Roll to determine who goes first (re-roll on ties)
  let die1 = rollSingleDie();
  let die2 = rollSingleDie();
  while (die1 === die2) {
    die1 = rollSingleDie();
    die2 = rollSingleDie();
  }

  const firstPlayer = die1 > die2 ? player1Id : player2Id;
  const openingDice: Dice = [die1, die2];
  const diceUsed = initializeDiceUsed(openingDice);

  const [game] = await db
    .insert(games)
    .values({
      series_id: seriesId,
      board: INITIAL_BOARD,
      bar: INITIAL_BAR,
      borne_off: INITIAL_BORNE_OFF,
      current_turn: firstPlayer,
      turn_phase: "moving",
      dice: openingDice,
      dice_used: diceUsed,
      doubling_cube: 1,
      cube_owner: null,
      version: 1,
      status: "in_progress",
    })
    .returning();

  logger.info({ gameId: game.id, firstPlayer, dice: openingDice }, "[GAME] Created new game");
  return gameRowToState(game);
}

// ── Public API ──

/**
 * Start a new best-of-N series for a session.
 */
export async function startSeries(
  sessionId: string,
  bestOf: number,
): Promise<SeriesState> {
  const players = await getSessionPlayers(sessionId);
  if (!players) throw new Error("Session not found or missing player 2");

  const [s] = await db
    .insert(series)
    .values({
      session_id: sessionId,
      best_of: bestOf,
      player1_score: 0,
      player2_score: 0,
      status: "active",
    })
    .returning();

  const game = await createNewGame(s.id, players.player1Id, players.player2Id);

  logger.info({ seriesId: s.id, sessionId, bestOf }, "[GAME] Started series");

  const state = seriesToState(s, game);
  publishGame(sessionId, { type: "game_state", data: state });
  return state;
}

/**
 * Get the current series and game state for a session.
 */
export async function getSeriesState(sessionId: string): Promise<SeriesState | null> {
  const s = await getActiveSeries(sessionId);
  if (!s) return null;

  const game = await getActiveGame(s.id);
  return seriesToState(s, game ? gameRowToState(game) : null);
}

/**
 * Submit moves for a turn.
 */
export async function submitMoves(
  gameId: string,
  playerId: string,
  version: number,
  playerMoves: Move[],
  sessionId: string,
): Promise<{ success: boolean; error?: string; status?: number }> {
  // Load game
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) return { success: false, error: "Game not found", status: 404 };
  if (game.version !== version) return { success: false, error: "Version mismatch", status: 409 };
  if (game.current_turn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turn_phase !== "moving") return { success: false, error: "Not in moving phase", status: 400 };
  if (!game.dice || !game.dice_used) return { success: false, error: "No dice rolled", status: 400 };

  // Get session for player role info
  const sessionPlayers = await getSessionPlayers(sessionId);
  if (!sessionPlayers) return { success: false, error: "Session not found", status: 404 };

  const role = getPlayerRole(playerId, sessionPlayers.player1Id);
  const opponentId = getOpponentId(playerId, sessionPlayers.player1Id, sessionPlayers.player2Id);

  const board = game.board as Board;
  const bar = game.bar as Bar;
  const borneOff = game.borne_off as BorneOff;
  const dice = game.dice as Dice;
  const diceUsed = game.dice_used as DiceUsed;

  // Validate turn
  const result = validateTurn(board, bar, borneOff, dice, diceUsed, playerMoves, role);
  if (!result.valid) {
    return { success: false, error: result.error ?? "Invalid moves", status: 422 };
  }

  // Log moves
  const moveRows = await db
    .select({ move_number: moves.move_number })
    .from(moves)
    .where(eq(moves.game_id, gameId));
  const moveCount = moveRows.length;

  for (let i = 0; i < playerMoves.length; i++) {
    await db.insert(moves).values({
      game_id: gameId,
      player_id: playerId,
      move_number: moveCount + i + 1,
      action_type: "move",
      action_data: playerMoves[i],
    });
  }

  // Check for win
  const winnerRole = checkWin(result.newBorneOff, "player1")
    ? "player1"
    : checkWin(result.newBorneOff, "player2")
      ? "player2"
      : null;

  if (winnerRole) {
    const winnerId = winnerRole === "player1" ? sessionPlayers.player1Id : sessionPlayers.player2Id;
    const points = calculateGamePoints(
      result.newBoard,
      result.newBar,
      result.newBorneOff,
      winnerRole,
      game.doubling_cube,
    );

    // Update game as complete
    await db
      .update(games)
      .set({
        board: result.newBoard,
        bar: result.newBar,
        borne_off: result.newBorneOff,
        dice_used: result.newDiceUsed,
        status: "complete",
        winner_id: winnerId,
        turn_phase: "turn_complete",
        version: game.version + 1,
        updated_at: new Date(),
      })
      .where(eq(games.id, gameId));

    // Update series scores
    const [s] = await db.select().from(series).where(eq(series.id, game.series_id));
    const newP1Score = s.player1_score + (winnerRole === "player1" ? points : 0);
    const newP2Score = s.player2_score + (winnerRole === "player2" ? points : 0);

    const seriesResult = checkSeriesComplete(newP1Score, newP2Score, s.best_of);

    if (seriesResult.complete) {
      const seriesWinnerId = seriesResult.winner === "player1"
        ? sessionPlayers.player1Id
        : sessionPlayers.player2Id;

      await db
        .update(series)
        .set({
          player1_score: newP1Score,
          player2_score: newP2Score,
          status: "complete",
          winner_id: seriesWinnerId,
        })
        .where(eq(series.id, s.id));

      publishGame(sessionId, { type: "series_complete", data: { winnerId: seriesWinnerId, player1Score: newP1Score, player2Score: newP2Score } });
    } else {
      await db
        .update(series)
        .set({ player1_score: newP1Score, player2_score: newP2Score })
        .where(eq(series.id, s.id));

      // Start next game
      await createNewGame(s.id, sessionPlayers.player1Id, sessionPlayers.player2Id);
      publishGame(sessionId, { type: "game_over", data: { winnerId, points, player1Score: newP1Score, player2Score: newP2Score } });
    }

    // Publish updated series state
    const updatedState = await getSeriesState(sessionId);
    if (updatedState) {
      publishGame(sessionId, { type: "game_state", data: updatedState });
    }

    logger.info({ gameId, winnerId, points }, "[GAME] Game won");
    return { success: true };
  }

  // No win — switch turn, auto-roll dice
  const newDice = rollDice();
  const newDiceUsed = initializeDiceUsed(newDice);
  const opRole = getPlayerRole(opponentId, sessionPlayers.player1Id);

  // Check if doubling is available
  const canDouble =
    game.doubling_cube < 64 &&
    (game.cube_owner === null || game.cube_owner === opponentId);

  let nextTurnPhase: string = canDouble ? "waiting_for_roll_or_double" : "moving";

  // Check if opponent has legal moves (only matters if going to "moving")
  if (nextTurnPhase === "moving" && !hasAnyLegalMove(result.newBoard, result.newBar, result.newBorneOff, newDice, newDiceUsed, opRole)) {
    logger.info({ gameId, opponentId }, "[GAME] Opponent has no legal moves, auto-passing");
    const passDice = rollDice();
    const passDiceUsed = initializeDiceUsed(passDice);

    await db
      .update(games)
      .set({
        board: result.newBoard,
        bar: result.newBar,
        borne_off: result.newBorneOff,
        current_turn: playerId,
        turn_phase: "moving",
        dice: passDice,
        dice_used: passDiceUsed,
        version: game.version + 1,
        updated_at: new Date(),
      })
      .where(eq(games.id, gameId));
  } else {
    await db
      .update(games)
      .set({
        board: result.newBoard,
        bar: result.newBar,
        borne_off: result.newBorneOff,
        current_turn: opponentId,
        turn_phase: nextTurnPhase,
        dice: newDice,
        dice_used: newDiceUsed,
        version: game.version + 1,
        updated_at: new Date(),
      })
      .where(eq(games.id, gameId));
  }

  // Publish updated state
  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    publishGame(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

/**
 * Propose doubling the stakes.
 */
export async function proposeDouble(
  gameId: string,
  playerId: string,
  sessionId: string,
): Promise<{ success: boolean; error?: string; status?: number }> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) return { success: false, error: "Game not found", status: 404 };
  if (game.current_turn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turn_phase !== "waiting_for_roll_or_double") {
    return { success: false, error: "Cannot double in this phase", status: 400 };
  }
  if (game.doubling_cube >= 64) return { success: false, error: "Cube at maximum", status: 400 };
  if (game.cube_owner !== null && game.cube_owner !== playerId) {
    return { success: false, error: "You don't own the cube", status: 403 };
  }

  await db
    .update(games)
    .set({ turn_phase: "double_proposed", version: game.version + 1, updated_at: new Date() })
    .where(eq(games.id, gameId));

  const sessionPlayers = await getSessionPlayers(sessionId);
  if (sessionPlayers) {
    const opponentId = getOpponentId(playerId, sessionPlayers.player1Id, sessionPlayers.player2Id);
    publishGame(sessionId, {
      type: "double_proposed",
      data: { cubeValue: game.doubling_cube * 2, proposedBy: playerId },
      forPlayer: opponentId,
    });
  }

  logger.info({ gameId, playerId, newValue: game.doubling_cube * 2 }, "[GAME] Double proposed");
  return { success: true };
}

/**
 * Respond to a double proposal (accept or decline).
 */
export async function respondToDouble(
  gameId: string,
  playerId: string,
  action: "accept" | "decline",
  sessionId: string,
): Promise<{ success: boolean; error?: string; status?: number }> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) return { success: false, error: "Game not found", status: 404 };
  if (game.turn_phase !== "double_proposed") {
    return { success: false, error: "No double pending", status: 400 };
  }
  if (game.current_turn === playerId) {
    return { success: false, error: "You proposed the double", status: 403 };
  }

  const sessionPlayers = await getSessionPlayers(sessionId);
  if (!sessionPlayers) return { success: false, error: "Session not found", status: 404 };

  if (action === "accept") {
    const newCubeValue = game.doubling_cube * 2;
    await db
      .update(games)
      .set({
        doubling_cube: newCubeValue,
        cube_owner: playerId,
        turn_phase: "moving",
        version: game.version + 1,
        updated_at: new Date(),
      })
      .where(eq(games.id, gameId));

    publishGame(sessionId, { type: "double_accepted", data: { cubeValue: newCubeValue } });
    logger.info({ gameId, playerId, cubeValue: newCubeValue }, "[GAME] Double accepted");
  } else {
    const proposerId = game.current_turn;
    const proposerRole = getPlayerRole(proposerId, sessionPlayers.player1Id);
    const points = game.doubling_cube;

    await db
      .update(games)
      .set({
        status: "complete",
        winner_id: proposerId,
        turn_phase: "turn_complete",
        version: game.version + 1,
        updated_at: new Date(),
      })
      .where(eq(games.id, gameId));

    const [s] = await db.select().from(series).where(eq(series.id, game.series_id));
    const newP1Score = s.player1_score + (proposerRole === "player1" ? points : 0);
    const newP2Score = s.player2_score + (proposerRole === "player2" ? points : 0);

    const seriesResult = checkSeriesComplete(newP1Score, newP2Score, s.best_of);

    if (seriesResult.complete) {
      const seriesWinnerId = seriesResult.winner === "player1"
        ? sessionPlayers.player1Id
        : sessionPlayers.player2Id;

      await db
        .update(series)
        .set({ player1_score: newP1Score, player2_score: newP2Score, status: "complete", winner_id: seriesWinnerId })
        .where(eq(series.id, s.id));

      publishGame(sessionId, { type: "series_complete", data: { winnerId: seriesWinnerId, player1Score: newP1Score, player2Score: newP2Score } });
    } else {
      await db
        .update(series)
        .set({ player1_score: newP1Score, player2_score: newP2Score })
        .where(eq(series.id, s.id));

      await createNewGame(s.id, sessionPlayers.player1Id, sessionPlayers.player2Id);
    }

    publishGame(sessionId, { type: "double_declined", data: { declinedBy: playerId, points } });
    logger.info({ gameId, playerId, points }, "[GAME] Double declined, game forfeited");
  }

  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    publishGame(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

/**
 * Send an emote (ephemeral, rate-limited).
 */
export function sendEmote(
  sessionId: string,
  playerId: string,
  emoteId: string,
): { success: boolean; error?: string } {
  const now = Date.now();
  const lastTime = lastEmoteTimestamp.get(playerId) ?? 0;
  if (now - lastTime < EMOTE_COOLDOWN_MS) {
    return { success: false, error: "Emote rate limited" };
  }

  lastEmoteTimestamp.set(playerId, now);
  publishGame(sessionId, {
    type: "emote",
    data: { emoteId, fromPlayer: playerId },
  });

  return { success: true };
}

/**
 * Roll dice for the current player (used when they skip doubling).
 */
export async function rollForTurn(
  gameId: string,
  playerId: string,
  sessionId: string,
): Promise<{ success: boolean; error?: string; status?: number }> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) return { success: false, error: "Game not found", status: 404 };
  if (game.current_turn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turn_phase !== "waiting_for_roll_or_double") {
    return { success: false, error: "Cannot roll in this phase", status: 400 };
  }

  // Dice were pre-rolled; just advance phase to moving
  await db
    .update(games)
    .set({ turn_phase: "moving", version: game.version + 1, updated_at: new Date() })
    .where(eq(games.id, gameId));

  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    publishGame(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

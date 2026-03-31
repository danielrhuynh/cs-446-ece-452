import type { Move, GameState, SeriesState } from "@appgammon/common";
import type { PersistableGameState } from "@appgammon/common";
import { db } from "../db/client";
import { games, moves, series, sessions } from "../db/schema";
import { and, count, eq } from "drizzle-orm";

export interface SessionPlayers {
  player1Id: string;
  player2Id: string;
}

export interface SeriesRecord {
  id: string;
  sessionId: string;
  bestOf: number;
  player1Score: number;
  player2Score: number;
  status: SeriesState["status"];
  winnerId: string | null;
}

export interface GameRepository {
  getSessionPlayers(sessionId: string): Promise<SessionPlayers | null>;
  getGame(gameId: string): Promise<GameState | null>;
  getActiveGame(seriesId: string): Promise<GameState | null>;
  createGame(state: PersistableGameState): Promise<GameState>;
  updateGame(gameId: string, patch: Partial<Omit<PersistableGameState, "seriesId">>): Promise<void>;
  createSeries(sessionId: string, bestOf: number): Promise<SeriesRecord>;
  getSeries(seriesId: string): Promise<SeriesRecord | null>;
  getActiveSeries(sessionId: string): Promise<SeriesRecord | null>;
  updateSeries(
    seriesId: string,
    patch: Partial<Pick<SeriesRecord, "player1Score" | "player2Score" | "status" | "winnerId">>,
  ): Promise<void>;
  countMoves(gameId: string): Promise<number>;
  appendMoves(
    gameId: string,
    playerId: string,
    startMoveNumber: number,
    playerMoves: Move[],
  ): Promise<void>;
}

function gameRowToState(game: typeof games.$inferSelect): GameState {
  return {
    id: game.id,
    seriesId: game.series_id,
    board: game.board as GameState["board"],
    bar: game.bar as GameState["bar"],
    borneOff: game.borne_off as GameState["borneOff"],
    currentTurn: game.current_turn,
    turnPhase: game.turn_phase as GameState["turnPhase"],
    dice: game.dice as GameState["dice"],
    diceUsed: game.dice_used as GameState["diceUsed"],
    doublingCube: game.doubling_cube,
    cubeOwner: game.cube_owner,
    version: game.version,
    status: game.status as GameState["status"],
    winnerId: game.winner_id,
  };
}

function seriesRowToRecord(value: typeof series.$inferSelect): SeriesRecord {
  return {
    id: value.id,
    sessionId: value.session_id,
    bestOf: value.best_of,
    player1Score: value.player1_score,
    player2Score: value.player2_score,
    status: value.status as SeriesState["status"],
    winnerId: value.winner_id,
  };
}

export const drizzleGameRepository: GameRepository = {
  async getSessionPlayers(sessionId) {
    const [session] = await db
      .select({ player_1_id: sessions.player_1_id, player_2_id: sessions.player_2_id })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session || !session.player_2_id) return null;
    return { player1Id: session.player_1_id, player2Id: session.player_2_id };
  },

  async getGame(gameId) {
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    return game ? gameRowToState(game) : null;
  },

  async getActiveGame(seriesId) {
    const [game] = await db
      .select()
      .from(games)
      .where(and(eq(games.series_id, seriesId), eq(games.status, "in_progress")))
      .limit(1);

    return game ? gameRowToState(game) : null;
  },

  async createGame(state) {
    const [game] = await db
      .insert(games)
      .values({
        series_id: state.seriesId,
        board: state.board,
        bar: state.bar,
        borne_off: state.borneOff,
        current_turn: state.currentTurn,
        turn_phase: state.turnPhase,
        dice: state.dice,
        dice_used: state.diceUsed,
        doubling_cube: state.doublingCube,
        cube_owner: state.cubeOwner,
        version: state.version,
        status: state.status,
        winner_id: state.winnerId,
      })
      .returning();

    return gameRowToState(game);
  },

  async updateGame(gameId, patch) {
    const update: Record<string, unknown> = { updated_at: new Date() };

    if (patch.board !== undefined) update.board = patch.board;
    if (patch.bar !== undefined) update.bar = patch.bar;
    if (patch.borneOff !== undefined) update.borne_off = patch.borneOff;
    if (patch.currentTurn !== undefined) update.current_turn = patch.currentTurn;
    if (patch.turnPhase !== undefined) update.turn_phase = patch.turnPhase;
    if (patch.dice !== undefined) update.dice = patch.dice;
    if (patch.diceUsed !== undefined) update.dice_used = patch.diceUsed;
    if (patch.doublingCube !== undefined) update.doubling_cube = patch.doublingCube;
    if (patch.cubeOwner !== undefined) update.cube_owner = patch.cubeOwner;
    if (patch.version !== undefined) update.version = patch.version;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.winnerId !== undefined) update.winner_id = patch.winnerId;

    await db.update(games).set(update).where(eq(games.id, gameId));
  },

  async createSeries(sessionId, bestOf) {
    const [created] = await db
      .insert(series)
      .values({
        session_id: sessionId,
        best_of: bestOf,
        player1_score: 0,
        player2_score: 0,
        status: "active",
      })
      .returning();

    return seriesRowToRecord(created);
  },

  async getSeries(seriesId) {
    const [value] = await db.select().from(series).where(eq(series.id, seriesId));
    return value ? seriesRowToRecord(value) : null;
  },

  async getActiveSeries(sessionId) {
    const [value] = await db
      .select()
      .from(series)
      .where(and(eq(series.session_id, sessionId), eq(series.status, "active")))
      .limit(1);

    return value ? seriesRowToRecord(value) : null;
  },

  async updateSeries(seriesId, patch) {
    const update: Record<string, unknown> = {};

    if (patch.player1Score !== undefined) update.player1_score = patch.player1Score;
    if (patch.player2Score !== undefined) update.player2_score = patch.player2Score;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.winnerId !== undefined) update.winner_id = patch.winnerId;

    await db.update(series).set(update).where(eq(series.id, seriesId));
  },

  async countMoves(gameId) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(moves)
      .where(eq(moves.game_id, gameId));

    return value;
  },

  async appendMoves(gameId, playerId, startMoveNumber, playerMoves) {
    for (let i = 0; i < playerMoves.length; i++) {
      await db.insert(moves).values({
        game_id: gameId,
        player_id: playerId,
        move_number: startMoveNumber + i,
        action_type: "move",
        action_data: playerMoves[i],
      });
    }
  },
};

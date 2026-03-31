import { session_status, type MatchState, type Move, type GameState } from "@appgammon/common";
import type { PersistableGameState } from "@appgammon/common";
import { db } from "../db/client";
import { games, matches, moves, sessions } from "../db/schema";
import { and, count, desc, eq, ne } from "drizzle-orm";

/** Handles game and match persistence plus row-to-domain mapping. */

export interface SessionPlayers {
  player1Id: string;
  player2Id: string;
  player1Connected: boolean;
  player2Connected: boolean;
}

export interface MatchRecord {
  id: string;
  sessionId: string;
  targetScore: number;
  player1Score: number;
  player2Score: number;
  status: MatchState["status"];
  winnerId: string | null;
}

export interface SessionGameContext {
  game: GameState;
  player1Id: string;
  player2Id: string;
  player1Connected: boolean;
  player2Connected: boolean;
}

export interface GameRepository {
  getSessionPlayers(sessionId: string): Promise<SessionPlayers | null>;
  getGameInSession(sessionId: string, gameId: string): Promise<SessionGameContext | null>;
  getActiveGame(matchId: string): Promise<GameState | null>;
  createGame(state: PersistableGameState): Promise<GameState>;
  updateGame(gameId: string, patch: Partial<Omit<PersistableGameState, "matchId">>): Promise<void>;
  createMatch(sessionId: string, targetScore: number): Promise<MatchRecord>;
  getMatch(matchId: string): Promise<MatchRecord | null>;
  getActiveMatch(sessionId: string): Promise<MatchRecord | null>;
  updateMatch(
    matchId: string,
    patch: Partial<Pick<MatchRecord, "player1Score" | "player2Score" | "status" | "winnerId">>,
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
    matchId: game.match_id,
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

function matchRowToRecord(value: typeof matches.$inferSelect): MatchRecord {
  return {
    id: value.id,
    sessionId: value.session_id,
    targetScore: value.target_score,
    player1Score: value.player1_score,
    player2Score: value.player2_score,
    status: value.status as MatchState["status"],
    winnerId: value.winner_id,
  };
}

export const drizzleGameRepository: GameRepository = {
  async getSessionPlayers(sessionId) {
    const [session] = await db
      .select({
        player_1_id: sessions.player_1_id,
        player_2_id: sessions.player_2_id,
        player_1_disconnected_at: sessions.player_1_disconnected_at,
        player_2_disconnected_at: sessions.player_2_disconnected_at,
        status: sessions.status,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session || !session.player_2_id || session.status === session_status.cancelled)
      return null;
    return {
      player1Id: session.player_1_id,
      player2Id: session.player_2_id,
      player1Connected: session.player_1_disconnected_at === null,
      player2Connected: session.player_2_disconnected_at === null,
    };
  },

  async getGameInSession(sessionId, gameId) {
    const [result] = await db
      .select({
        game: games,
        player1Id: sessions.player_1_id,
        player2Id: sessions.player_2_id,
        player1DisconnectedAt: sessions.player_1_disconnected_at,
        player2DisconnectedAt: sessions.player_2_disconnected_at,
      })
      .from(games)
      .innerJoin(matches, eq(games.match_id, matches.id))
      .innerJoin(sessions, eq(matches.session_id, sessions.id))
      .where(
        and(
          eq(games.id, gameId),
          eq(matches.session_id, sessionId),
          ne(sessions.status, session_status.cancelled),
        ),
      );

    if (!result || !result.player2Id) return null;

    return {
      game: gameRowToState(result.game),
      player1Id: result.player1Id,
      player2Id: result.player2Id,
      player1Connected: result.player1DisconnectedAt === null,
      player2Connected: result.player2DisconnectedAt === null,
    };
  },

  async getActiveGame(matchId) {
    const [game] = await db
      .select()
      .from(games)
      .where(and(eq(games.match_id, matchId), eq(games.status, "in_progress")))
      .orderBy(desc(games.created_at))
      .limit(1);

    return game ? gameRowToState(game) : null;
  },

  async createGame(state) {
    const [game] = await db
      .insert(games)
      .values({
        match_id: state.matchId,
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

  async createMatch(sessionId, targetScore) {
    const [created] = await db
      .insert(matches)
      .values({
        session_id: sessionId,
        target_score: targetScore,
        player1_score: 0,
        player2_score: 0,
        status: "active",
      })
      .returning();

    return matchRowToRecord(created);
  },

  async getMatch(matchId) {
    const [value] = await db.select().from(matches).where(eq(matches.id, matchId));
    return value ? matchRowToRecord(value) : null;
  },

  async getActiveMatch(sessionId) {
    const [value] = await db
      .select()
      .from(matches)
      .innerJoin(sessions, eq(matches.session_id, sessions.id))
      .where(
        and(
          eq(matches.session_id, sessionId),
          eq(matches.status, "active"),
          ne(sessions.status, session_status.cancelled),
        ),
      )
      .orderBy(desc(matches.created_at))
      .limit(1);

    return value ? matchRowToRecord(value.matches) : null;
  },

  async updateMatch(matchId, patch) {
    const update: Record<string, unknown> = {};

    if (patch.player1Score !== undefined) update.player1_score = patch.player1Score;
    if (patch.player2Score !== undefined) update.player2_score = patch.player2Score;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.winnerId !== undefined) update.winner_id = patch.winnerId;

    await db.update(matches).set(update).where(eq(matches.id, matchId));
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

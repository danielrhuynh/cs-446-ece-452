import {
  ACTION_TYPE,
  GAME_STATUS,
  MATCH_STATUS,
  SESSION_STATUS,
  type GameState,
  type MatchState,
  type Move,
  type PersistableGameState,
} from "@appgammon/common";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "../db/client";
import { games, matches, moves, sessions } from "../db/schema";

function toGame(game: typeof games.$inferSelect): GameState {
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

function toMatch(match: typeof matches.$inferSelect) {
  return {
    id: match.id,
    sessionId: match.session_id,
    targetScore: match.target_score,
    player1Score: match.player1_score,
    player2Score: match.player2_score,
    status: match.status as MatchState["status"],
    winnerId: match.winner_id,
  };
}

function gameUpdate(patch: Partial<Omit<PersistableGameState, "matchId">>) {
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

  return update;
}

export const matchRepo = {
  async getSessionPlayers(sessionId: string) {
    const [session] = await db
      .select({
        player_1_id: sessions.player_1_id,
        player_2_id: sessions.player_2_id,
        status: sessions.status,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session || !session.player_2_id || session.status === SESSION_STATUS.cancelled) {
      return null;
    }

    return {
      player1Id: session.player_1_id,
      player2Id: session.player_2_id,
    };
  },

  async getGameInSession(sessionId: string, gameId: string) {
    const [result] = await db
      .select({
        game: games,
        player1Id: sessions.player_1_id,
        player2Id: sessions.player_2_id,
      })
      .from(games)
      .innerJoin(matches, eq(games.match_id, matches.id))
      .innerJoin(sessions, eq(matches.session_id, sessions.id))
      .where(
        and(
          eq(games.id, gameId),
          eq(matches.session_id, sessionId),
          ne(sessions.status, SESSION_STATUS.cancelled),
        ),
      );

    if (!result || !result.player2Id) return null;

    return {
      game: toGame(result.game),
      player1Id: result.player1Id,
      player2Id: result.player2Id,
    };
  },

  async getActiveGame(matchId: string) {
    const [game] = await db
      .select()
      .from(games)
      .where(and(eq(games.match_id, matchId), eq(games.status, GAME_STATUS.inProgress)))
      .orderBy(desc(games.created_at))
      .limit(1);

    return game ? toGame(game) : null;
  },

  async createGame(state: PersistableGameState) {
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

    return toGame(game);
  },

  async updateGame(gameId: string, patch: Partial<Omit<PersistableGameState, "matchId">>) {
    await db.update(games).set(gameUpdate(patch)).where(eq(games.id, gameId));
  },

  async createMatch(sessionId: string, targetScore: number) {
    const [match] = await db
      .insert(matches)
      .values({
        session_id: sessionId,
        target_score: targetScore,
        player1_score: 0,
        player2_score: 0,
        status: MATCH_STATUS.active,
      })
      .returning();

    return toMatch(match);
  },

  async getMatch(matchId: string) {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    return match ? toMatch(match) : null;
  },

  async getActiveMatch(sessionId: string) {
    const [match] = await db
      .select()
      .from(matches)
      .innerJoin(sessions, eq(matches.session_id, sessions.id))
      .where(
        and(
          eq(matches.session_id, sessionId),
          eq(matches.status, MATCH_STATUS.active),
          ne(sessions.status, SESSION_STATUS.cancelled),
        ),
      )
      .orderBy(desc(matches.created_at))
      .limit(1);

    return match ? toMatch(match.matches) : null;
  },

  async updateMatch(
    matchId: string,
    patch: {
      player1Score?: number;
      player2Score?: number;
      status?: MatchState["status"];
      winnerId?: string | null;
    },
  ) {
    const update: Record<string, unknown> = {};

    if (patch.player1Score !== undefined) update.player1_score = patch.player1Score;
    if (patch.player2Score !== undefined) update.player2_score = patch.player2Score;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.winnerId !== undefined) update.winner_id = patch.winnerId;

    await db.update(matches).set(update).where(eq(matches.id, matchId));
  },

  async countMoves(gameId: string) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(moves)
      .where(eq(moves.game_id, gameId));

    return value;
  },

  async appendMoves(
    gameId: string,
    playerId: string,
    startMoveNumber: number,
    playerMoves: Move[],
  ) {
    if (playerMoves.length === 0) return;

    await db.insert(moves).values(
      playerMoves.map((move, index) => ({
        game_id: gameId,
        player_id: playerId,
        move_number: startMoveNumber + index,
        action_type: ACTION_TYPE.move,
        action_data: move,
      })),
    );
  },
};

export type SessionPlayers = NonNullable<Awaited<ReturnType<typeof matchRepo.getSessionPlayers>>>;
export type MatchGameContext = NonNullable<Awaited<ReturnType<typeof matchRepo.getGameInSession>>>;
export type MatchRecord = NonNullable<Awaited<ReturnType<typeof matchRepo.getMatch>>>;

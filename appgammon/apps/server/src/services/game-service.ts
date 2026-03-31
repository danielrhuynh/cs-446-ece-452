/**
 * Game service — application orchestration for backgammon gameplay.
 * Loads and persists state through repositories, delegates transitions to
 * pure gameplay helpers, and publishes typed game events.
 */

import {
  INITIAL_BAR,
  INITIAL_BOARD,
  INITIAL_BORNE_OFF,
  advanceTurnState,
  applySeriesPoints,
  calculateGamePoints,
  createOpeningGameState,
  determineWinnerRole,
  hasAnyLegalMove,
  rollDice,
  rollSingleDie,
  type Dice,
  type GameState,
  type Move,
  type PlayerRole,
  type SeriesState,
  validateTurn,
} from "@appgammon/common";
import { gameEventBus } from "../event-bus/game-event-bus";
import { drizzleGameRepository, type SessionGameContext } from "../repositories/game-repository";
import { logger } from "../utils/logger";

const gameRepository = drizzleGameRepository;

// ── Emote rate limiting (in-memory) ──

const lastEmoteTimestamp = new Map<string, number>();
const EMOTE_COOLDOWN_MS = 3000;

type ActionResult = { success: true } | { success: false; error: string; status: number };
type StartSeriesResult =
  | { success: true; data: SeriesState }
  | { success: false; error: string; status: number };

function getPlayerRole(playerId: string, player1Id: string, player2Id: string): PlayerRole | null {
  if (playerId === player1Id) return "player1";
  if (playerId === player2Id) return "player2";
  return null;
}

function getOpponentId(role: PlayerRole, player1Id: string, player2Id: string): string {
  return role === "player1" ? player2Id : player1Id;
}

async function getGameContext(
  sessionId: string,
  gameId: string,
): Promise<SessionGameContext | null> {
  return gameRepository.getGameInSession(sessionId, gameId);
}

function seriesToState(
  seriesRecord: Awaited<ReturnType<typeof gameRepository.getSeries>> extends infer T
    ? NonNullable<T>
    : never,
  currentGame: GameState | null,
): SeriesState {
  return {
    id: seriesRecord.id,
    sessionId: seriesRecord.sessionId,
    bestOf: seriesRecord.bestOf,
    player1Score: seriesRecord.player1Score,
    player2Score: seriesRecord.player2Score,
    status: seriesRecord.status,
    winnerId: seriesRecord.winnerId,
    currentGame,
  };
}

async function createNewGame(
  seriesId: string,
  player1Id: string,
  player2Id: string,
): Promise<GameState> {
  let die1 = rollSingleDie();
  let die2 = rollSingleDie();

  while (die1 === die2) {
    die1 = rollSingleDie();
    die2 = rollSingleDie();
  }

  const openingDice: Dice = [die1, die2];
  const newGame = createOpeningGameState({
    seriesId,
    player1Id,
    player2Id,
    openingDice,
    initialBoard: INITIAL_BOARD,
    initialBar: INITIAL_BAR,
    initialBorneOff: INITIAL_BORNE_OFF,
  });

  const game = await gameRepository.createGame(newGame);
  logger.info(
    { gameId: game.id, firstPlayer: game.currentTurn, dice: openingDice },
    "[GAME] Created new game",
  );
  return game;
}

export async function startSeries(sessionId: string, bestOf: number): Promise<StartSeriesResult> {
  const existingSeries = await gameRepository.getActiveSeries(sessionId);
  if (existingSeries) {
    return {
      success: false,
      error: "An active series already exists for this session",
      status: 409,
    };
  }

  const players = await gameRepository.getSessionPlayers(sessionId);
  if (!players) {
    return {
      success: false,
      error: "Session not found or missing player 2",
      status: 404,
    };
  }

  const seriesRecord = await gameRepository.createSeries(sessionId, bestOf);
  const game = await createNewGame(seriesRecord.id, players.player1Id, players.player2Id);

  logger.info({ seriesId: seriesRecord.id, sessionId, bestOf }, "[GAME] Started series");

  const state = seriesToState(seriesRecord, game);
  gameEventBus.publish(sessionId, { type: "game_state", data: state });
  return { success: true, data: state };
}

export async function getSeriesState(sessionId: string): Promise<SeriesState | null> {
  const seriesRecord = await gameRepository.getActiveSeries(sessionId);
  if (!seriesRecord) return null;

  const game = await gameRepository.getActiveGame(seriesRecord.id);
  return seriesToState(seriesRecord, game);
}

export async function submitMoves(
  gameId: string,
  playerId: string,
  version: number,
  playerMoves: Move[],
  sessionId: string,
): Promise<ActionResult> {
  const context = await getGameContext(sessionId, gameId);
  if (!context) return { success: false, error: "Game not found for session", status: 404 };
  const { game, player1Id, player2Id } = context;
  if (game.version !== version) return { success: false, error: "Version mismatch", status: 409 };
  if (game.currentTurn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turnPhase !== "moving")
    return { success: false, error: "Not in moving phase", status: 400 };
  if (!game.dice || !game.diceUsed) return { success: false, error: "No dice rolled", status: 400 };

  const role = getPlayerRole(playerId, player1Id, player2Id);
  if (!role) return { success: false, error: "Forbidden", status: 403 };
  const opponentId = getOpponentId(role, player1Id, player2Id);

  const result = validateTurn(
    game.board,
    game.bar,
    game.borneOff,
    game.dice,
    game.diceUsed,
    playerMoves,
    role,
  );
  if (!result.valid) {
    return { success: false, error: result.error ?? "Invalid moves", status: 422 };
  }

  const moveCount = await gameRepository.countMoves(gameId);
  await gameRepository.appendMoves(gameId, playerId, moveCount + 1, playerMoves);

  const winnerRole = determineWinnerRole(result.newBorneOff);
  if (winnerRole) {
    const winnerId = winnerRole === "player1" ? player1Id : player2Id;
    const points = calculateGamePoints(
      result.newBoard,
      result.newBar,
      result.newBorneOff,
      winnerRole,
      game.doublingCube,
    );

    await gameRepository.updateGame(gameId, {
      board: result.newBoard,
      bar: result.newBar,
      borneOff: result.newBorneOff,
      diceUsed: result.newDiceUsed,
      status: "complete",
      winnerId,
      turnPhase: "turn_complete",
      version: game.version + 1,
    });

    const seriesRecord = await gameRepository.getSeries(game.seriesId);
    if (!seriesRecord) return { success: false, error: "Series not found", status: 404 };

    const nextSeries = applySeriesPoints({
      player1Score: seriesRecord.player1Score,
      player2Score: seriesRecord.player2Score,
      bestOf: seriesRecord.bestOf,
      winnerRole,
      points,
    });

    if (nextSeries.status === "complete") {
      const seriesWinnerId = nextSeries.winnerRole === "player1" ? player1Id : player2Id;

      await gameRepository.updateSeries(seriesRecord.id, {
        player1Score: nextSeries.player1Score,
        player2Score: nextSeries.player2Score,
        status: "complete",
        winnerId: seriesWinnerId,
      });

      gameEventBus.publish(sessionId, {
        type: "series_complete",
        data: {
          winnerId: seriesWinnerId,
          player1Score: nextSeries.player1Score,
          player2Score: nextSeries.player2Score,
        },
      });
    } else {
      await gameRepository.updateSeries(seriesRecord.id, {
        player1Score: nextSeries.player1Score,
        player2Score: nextSeries.player2Score,
      });

      await createNewGame(seriesRecord.id, player1Id, player2Id);
      gameEventBus.publish(sessionId, {
        type: "game_over",
        data: {
          winnerId,
          points,
          player1Score: nextSeries.player1Score,
          player2Score: nextSeries.player2Score,
        },
      });
    }

    const updatedState = await getSeriesState(sessionId);
    if (updatedState) {
      gameEventBus.publish(sessionId, { type: "game_state", data: updatedState });
    }

    logger.info({ gameId, winnerId, points }, "[GAME] Game won");
    return { success: true };
  }

  const nextTurn = advanceTurnState({
    board: result.newBoard,
    bar: result.newBar,
    borneOff: result.newBorneOff,
    player1Id,
    currentPlayerId: playerId,
    opponentId,
    doublingCube: game.doublingCube,
    cubeOwner: game.cubeOwner,
    opponentRoll: rollDice(),
    currentPlayerRoll: rollDice(),
    fallbackOpponentRoll: rollDice(),
  });

  await gameRepository.updateGame(gameId, {
    board: result.newBoard,
    bar: result.newBar,
    borneOff: result.newBorneOff,
    currentTurn: nextTurn.currentTurn,
    turnPhase: nextTurn.turnPhase,
    dice: nextTurn.dice,
    diceUsed: nextTurn.diceUsed,
    version: game.version + 1,
  });

  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    gameEventBus.publish(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

export async function proposeDouble(
  gameId: string,
  playerId: string,
  sessionId: string,
): Promise<ActionResult> {
  const context = await getGameContext(sessionId, gameId);
  if (!context) return { success: false, error: "Game not found for session", status: 404 };
  const { game, player1Id, player2Id } = context;
  if (game.currentTurn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turnPhase !== "waiting_for_roll_or_double") {
    return { success: false, error: "Cannot double in this phase", status: 400 };
  }
  if (game.doublingCube >= 64) return { success: false, error: "Cube at maximum", status: 400 };
  if (game.cubeOwner !== null && game.cubeOwner !== playerId) {
    return { success: false, error: "You don't own the cube", status: 403 };
  }

  await gameRepository.updateGame(gameId, {
    turnPhase: "double_proposed",
    version: game.version + 1,
  });

  const role = getPlayerRole(playerId, player1Id, player2Id);
  if (!role) return { success: false, error: "Forbidden", status: 403 };
  const opponentId = getOpponentId(role, player1Id, player2Id);
  gameEventBus.publish(sessionId, {
    type: "double_proposed",
    data: { cubeValue: game.doublingCube * 2, proposedBy: playerId },
    forPlayer: opponentId,
  });

  logger.info({ gameId, playerId, newValue: game.doublingCube * 2 }, "[GAME] Double proposed");
  return { success: true };
}

export async function respondToDouble(
  gameId: string,
  playerId: string,
  action: "accept" | "decline",
  sessionId: string,
): Promise<ActionResult> {
  const context = await getGameContext(sessionId, gameId);
  if (!context) return { success: false, error: "Game not found for session", status: 404 };
  const { game, player1Id, player2Id } = context;
  if (game.turnPhase !== "double_proposed") {
    return { success: false, error: "No double pending", status: 400 };
  }
  if (game.currentTurn === playerId) {
    return { success: false, error: "You proposed the double", status: 403 };
  }

  if (action === "accept") {
    const newCubeValue = game.doublingCube * 2;
    await gameRepository.updateGame(gameId, {
      doublingCube: newCubeValue,
      cubeOwner: playerId,
      turnPhase: "moving",
      version: game.version + 1,
    });

    gameEventBus.publish(sessionId, { type: "double_accepted", data: { cubeValue: newCubeValue } });
    logger.info({ gameId, playerId, cubeValue: newCubeValue }, "[GAME] Double accepted");
  } else {
    const proposerId = game.currentTurn;
    const proposerRole = getPlayerRole(proposerId, player1Id, player2Id);
    if (!proposerRole) return { success: false, error: "Forbidden", status: 403 };
    const points = game.doublingCube;

    await gameRepository.updateGame(gameId, {
      status: "complete",
      winnerId: proposerId,
      turnPhase: "turn_complete",
      version: game.version + 1,
    });

    const seriesRecord = await gameRepository.getSeries(game.seriesId);
    if (!seriesRecord) return { success: false, error: "Series not found", status: 404 };

    const nextSeries = applySeriesPoints({
      player1Score: seriesRecord.player1Score,
      player2Score: seriesRecord.player2Score,
      bestOf: seriesRecord.bestOf,
      winnerRole: proposerRole,
      points,
    });

    if (nextSeries.status === "complete") {
      const seriesWinnerId = nextSeries.winnerRole === "player1" ? player1Id : player2Id;

      await gameRepository.updateSeries(seriesRecord.id, {
        player1Score: nextSeries.player1Score,
        player2Score: nextSeries.player2Score,
        status: "complete",
        winnerId: seriesWinnerId,
      });

      gameEventBus.publish(sessionId, {
        type: "series_complete",
        data: {
          winnerId: seriesWinnerId,
          player1Score: nextSeries.player1Score,
          player2Score: nextSeries.player2Score,
        },
      });
    } else {
      await gameRepository.updateSeries(seriesRecord.id, {
        player1Score: nextSeries.player1Score,
        player2Score: nextSeries.player2Score,
      });

      await createNewGame(seriesRecord.id, player1Id, player2Id);
    }

    gameEventBus.publish(sessionId, {
      type: "double_declined",
      data: { declinedBy: playerId, points },
    });
    logger.info({ gameId, playerId, points }, "[GAME] Double declined, game forfeited");
  }

  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    gameEventBus.publish(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

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
  gameEventBus.publish(sessionId, {
    type: "emote",
    data: { emoteId, fromPlayer: playerId },
  });

  return { success: true };
}

export async function rollForTurn(
  gameId: string,
  playerId: string,
  sessionId: string,
): Promise<ActionResult> {
  const context = await getGameContext(sessionId, gameId);
  if (!context) return { success: false, error: "Game not found for session", status: 404 };
  const { game, player1Id, player2Id } = context;
  if (game.currentTurn !== playerId) return { success: false, error: "Not your turn", status: 403 };
  if (game.turnPhase !== "waiting_for_roll_or_double") {
    return { success: false, error: "Cannot roll in this phase", status: 400 };
  }
  if (!game.dice || !game.diceUsed) {
    return { success: false, error: "No dice available", status: 400 };
  }

  const role = getPlayerRole(playerId, player1Id, player2Id);
  if (!role) return { success: false, error: "Forbidden", status: 403 };

  if (!hasAnyLegalMove(game.board, game.bar, game.borneOff, game.dice, game.diceUsed, role)) {
    logger.info({ gameId, playerId }, "[GAME] Skipping turn, no legal moves");
    const opponentId = getOpponentId(role, player1Id, player2Id);
    const nextTurn = advanceTurnState({
      board: game.board,
      bar: game.bar,
      borneOff: game.borneOff,
      player1Id,
      currentPlayerId: playerId,
      opponentId,
      doublingCube: game.doublingCube,
      cubeOwner: game.cubeOwner,
      opponentRoll: rollDice(),
      currentPlayerRoll: rollDice(),
      fallbackOpponentRoll: rollDice(),
    });

    await gameRepository.updateGame(gameId, {
      currentTurn: nextTurn.currentTurn,
      turnPhase: nextTurn.turnPhase,
      dice: nextTurn.dice,
      diceUsed: nextTurn.diceUsed,
      version: game.version + 1,
    });
  } else {
    await gameRepository.updateGame(gameId, {
      turnPhase: "moving",
      version: game.version + 1,
    });
  }

  const updatedState = await getSeriesState(sessionId);
  if (updatedState) {
    gameEventBus.publish(sessionId, { type: "game_state", data: updatedState });
  }

  return { success: true };
}

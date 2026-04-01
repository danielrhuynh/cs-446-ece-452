import {
  MATCH_EVENT_TYPE,
  INITIAL_BAR,
  INITIAL_BOARD,
  INITIAL_BORNE_OFF,
  advanceTurnState,
  applyMatchPoints,
  calculateGamePoints,
  createOpeningGameState,
  determineWinnerRole,
  hasAnyLegalMove,
  rollDice,
  rollSingleDie,
  type Dice,
  type GameState,
  type MatchState,
  type Move,
  type PlayerRole,
  validateTurn,
} from "@appgammon/common";
import { matchEventBus } from "../event-bus/match-event-bus";
import {
  matchRepo,
  type MatchRecord,
  type MatchGameContext,
} from "../repositories/match-repository";
import { logger } from "../utils/logger";
import { getPlayerRole, getOpponentId } from "../helpers/player";

const lastEmoteTimestamp = new Map<string, number>();
const EMOTE_COOLDOWN_MS = 3000;

type MatchRepo = typeof matchRepo;
type MatchEventBusPort = Pick<typeof matchEventBus, "publish">;

export class MatchService {
  private readonly matchRepo: MatchRepo;
  private readonly eventBus: MatchEventBusPort;

  constructor(matchRepository: MatchRepo = matchRepo, eventBus: MatchEventBusPort = matchEventBus) {
    this.matchRepo = matchRepository;
    this.eventBus = eventBus;
  }

  async startMatch(sessionId: string, targetScore: number) {
    const existingMatch = await this.matchRepo.getActiveMatch(sessionId);
    if (existingMatch) {
      return {
        success: false,
        error: "An active match already exists for this session",
        status: 409,
      };
    }

    const players = await this.matchRepo.getSessionPlayers(sessionId);
    if (!players) {
      return {
        success: false,
        error: "Session not found or missing player 2",
        status: 404,
      };
    }

    const matchRecord = await this.matchRepo.createMatch(sessionId, targetScore);
    const game = await this.createNewGame(matchRecord.id, players.player1Id, players.player2Id);

    logger.info({ matchId: matchRecord.id, sessionId, targetScore }, "[MATCH] Started match");

    const state = this.matchToState(matchRecord, game);
    this.eventBus.publish(sessionId, { type: MATCH_EVENT_TYPE.state, data: state });
    return { success: true, data: state };
  }

  async getMatchState(sessionId: string): Promise<MatchState | null> {
    const matchRecord = await this.matchRepo.getActiveMatch(sessionId);
    if (!matchRecord) return null;

    const game = await this.matchRepo.getActiveGame(matchRecord.id);
    return this.matchToState(matchRecord, game);
  }

  async submitMoves(
    gameId: string,
    playerId: string,
    version: number,
    playerMoves: Move[],
    sessionId: string,
  ) {
    const context = await this.getGameContext(sessionId, gameId);
    if (!context) return { success: false, error: "Game not found for session", status: 404 };

    const { game, player1Id, player2Id } = context;
    if (game.version !== version) {
      return { success: false, error: "Version mismatch", status: 409 };
    }
    if (game.currentTurn !== playerId) {
      return { success: false, error: "Not your turn", status: 403 };
    }
    if (game.turnPhase !== "moving") {
      return { success: false, error: "Not in moving phase", status: 400 };
    }
    if (!game.dice || !game.diceUsed) {
      return { success: false, error: "No dice rolled", status: 400 };
    }

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

    const moveCount = await this.matchRepo.countMoves(gameId);
    await this.matchRepo.appendMoves(gameId, playerId, moveCount + 1, playerMoves);

    const winnerRole = determineWinnerRole(result.newBorneOff);
    if (winnerRole) {
      return this.completeGameAfterMove({
        game,
        gameId,
        player1Id,
        player2Id,
        sessionId,
        winnerRole,
        board: result.newBoard,
        bar: result.newBar,
        borneOff: result.newBorneOff,
        diceUsed: result.newDiceUsed,
      });
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

    await this.matchRepo.updateGame(gameId, {
      board: result.newBoard,
      bar: result.newBar,
      borneOff: result.newBorneOff,
      currentTurn: nextTurn.currentTurn,
      turnPhase: nextTurn.turnPhase,
      dice: nextTurn.dice,
      diceUsed: nextTurn.diceUsed,
      version: game.version + 1,
    });

    await this.publishLatestMatchState(sessionId);
    return { success: true };
  }

  async proposeDouble(gameId: string, playerId: string, sessionId: string) {
    const context = await this.getGameContext(sessionId, gameId);
    if (!context) return { success: false, error: "Game not found for session", status: 404 };

    const { game, player1Id, player2Id } = context;
    if (game.currentTurn !== playerId) {
      return { success: false, error: "Not your turn", status: 403 };
    }
    if (game.turnPhase !== "waiting_for_roll_or_double") {
      return { success: false, error: "Cannot double in this phase", status: 400 };
    }
    if (game.doublingCube >= 64) {
      return { success: false, error: "Cube at maximum", status: 400 };
    }
    if (game.cubeOwner !== null && game.cubeOwner !== playerId) {
      return { success: false, error: "You don't own the cube", status: 403 };
    }

    await this.matchRepo.updateGame(gameId, {
      turnPhase: "double_proposed",
      version: game.version + 1,
    });

    const role = getPlayerRole(playerId, player1Id, player2Id);
    if (!role) return { success: false, error: "Forbidden", status: 403 };

    const opponentId = getOpponentId(role, player1Id, player2Id);
    this.eventBus.publish(sessionId, {
      type: MATCH_EVENT_TYPE.doubleProposed,
      data: { cubeValue: game.doublingCube * 2, proposedBy: playerId },
      forPlayer: opponentId,
    });

    logger.info({ gameId, playerId, newValue: game.doublingCube * 2 }, "[GAME] Double proposed");
    return { success: true };
  }

  async respondToDouble(
    gameId: string,
    playerId: string,
    action: "accept" | "decline",
    sessionId: string,
  ) {
    const context = await this.getGameContext(sessionId, gameId);
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
      await this.matchRepo.updateGame(gameId, {
        doublingCube: newCubeValue,
        cubeOwner: playerId,
        turnPhase: "moving",
        version: game.version + 1,
      });

      this.eventBus.publish(sessionId, {
        type: MATCH_EVENT_TYPE.doubleAccepted,
        data: { cubeValue: newCubeValue },
      });
      logger.info({ gameId, playerId, cubeValue: newCubeValue }, "[GAME] Double accepted");
    } else {
      const proposerId = game.currentTurn;
      const proposerRole = getPlayerRole(proposerId, player1Id, player2Id);
      if (!proposerRole) return { success: false, error: "Forbidden", status: 403 };

      const points = game.doublingCube;
      await this.matchRepo.updateGame(gameId, {
        status: "complete",
        winnerId: proposerId,
        turnPhase: "turn_complete",
        version: game.version + 1,
      });

      const matchRecord = await this.matchRepo.getMatch(game.matchId);
      if (!matchRecord) return { success: false, error: "Match not found", status: 404 };

      const nextMatch = applyMatchPoints({
        player1Score: matchRecord.player1Score,
        player2Score: matchRecord.player2Score,
        targetScore: matchRecord.targetScore,
        winnerRole: proposerRole,
        points,
      });

      if (nextMatch.status === "complete") {
        const matchWinnerId = nextMatch.winnerRole === "player1" ? player1Id : player2Id;

        await this.matchRepo.updateMatch(matchRecord.id, {
          player1Score: nextMatch.player1Score,
          player2Score: nextMatch.player2Score,
          status: "complete",
          winnerId: matchWinnerId,
        });

        this.eventBus.publish(sessionId, {
          type: MATCH_EVENT_TYPE.matchComplete,
          data: {
            winnerId: matchWinnerId,
            player1Score: nextMatch.player1Score,
            player2Score: nextMatch.player2Score,
          },
        });
      } else {
        await this.matchRepo.updateMatch(matchRecord.id, {
          player1Score: nextMatch.player1Score,
          player2Score: nextMatch.player2Score,
        });

        await this.createNewGame(matchRecord.id, player1Id, player2Id);
      }

      this.eventBus.publish(sessionId, {
        type: MATCH_EVENT_TYPE.doubleDeclined,
        data: { declinedBy: playerId, points },
      });
      logger.info({ gameId, playerId, points }, "[GAME] Double declined, game forfeited");
    }

    await this.publishLatestMatchState(sessionId);
    return { success: true };
  }

  async sendEmote(sessionId: string, playerId: string, emoteId: string) {
    const players = await this.matchRepo.getSessionPlayers(sessionId);
    if (!players) {
      return { success: false, error: "Session not found or missing player 2", status: 404 };
    }

    const now = Date.now();
    const lastTime = lastEmoteTimestamp.get(playerId) ?? 0;
    if (now - lastTime < EMOTE_COOLDOWN_MS) {
      return { success: false, error: "Emote rate limited", status: 429 };
    }

    lastEmoteTimestamp.set(playerId, now);
    this.eventBus.publish(sessionId, {
      type: MATCH_EVENT_TYPE.emote,
      data: { emoteId, fromPlayer: playerId },
    });

    return { success: true };
  }

  async rollForTurn(gameId: string, playerId: string, sessionId: string) {
    const context = await this.getGameContext(sessionId, gameId);
    if (!context) return { success: false, error: "Game not found for session", status: 404 };

    const { game, player1Id, player2Id } = context;
    if (game.currentTurn !== playerId) {
      return { success: false, error: "Not your turn", status: 403 };
    }
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

      await this.matchRepo.updateGame(gameId, {
        currentTurn: nextTurn.currentTurn,
        turnPhase: nextTurn.turnPhase,
        dice: nextTurn.dice,
        diceUsed: nextTurn.diceUsed,
        version: game.version + 1,
      });
    } else {
      await this.matchRepo.updateGame(gameId, {
        turnPhase: "moving",
        version: game.version + 1,
      });
    }

    await this.publishLatestMatchState(sessionId);
    return { success: true };
  }

  private async getGameContext(
    sessionId: string,
    gameId: string,
  ): Promise<MatchGameContext | null> {
    return this.matchRepo.getGameInSession(sessionId, gameId);
  }

  private matchToState(matchRecord: MatchRecord, currentGame: GameState | null): MatchState {
    return {
      id: matchRecord.id,
      sessionId: matchRecord.sessionId,
      targetScore: matchRecord.targetScore,
      player1Score: matchRecord.player1Score,
      player2Score: matchRecord.player2Score,
      status: matchRecord.status,
      winnerId: matchRecord.winnerId,
      currentGame,
    };
  }

  private async createNewGame(
    matchId: string,
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
      matchId,
      player1Id,
      player2Id,
      openingDice,
      initialBoard: INITIAL_BOARD,
      initialBar: INITIAL_BAR,
      initialBorneOff: INITIAL_BORNE_OFF,
    });

    const game = await this.matchRepo.createGame(newGame);
    logger.info(
      { gameId: game.id, firstPlayer: game.currentTurn, dice: openingDice },
      "[GAME] Created new game",
    );
    return game;
  }

  private async publishLatestMatchState(sessionId: string) {
    const state = await this.getMatchState(sessionId);
    if (!state) return;

    this.eventBus.publish(sessionId, { type: MATCH_EVENT_TYPE.state, data: state });
  }

  private async completeGameAfterMove(input: {
    game: GameState;
    gameId: string;
    player1Id: string;
    player2Id: string;
    sessionId: string;
    winnerRole: PlayerRole;
    board: GameState["board"];
    bar: GameState["bar"];
    borneOff: GameState["borneOff"];
    diceUsed: NonNullable<GameState["diceUsed"]>;
  }) {
    const { game, gameId, player1Id, player2Id, sessionId, winnerRole } = input;
    const winnerId = winnerRole === "player1" ? player1Id : player2Id;
    const points = calculateGamePoints(
      input.board,
      input.bar,
      input.borneOff,
      winnerRole,
      game.doublingCube,
    );

    await this.matchRepo.updateGame(gameId, {
      board: input.board,
      bar: input.bar,
      borneOff: input.borneOff,
      diceUsed: input.diceUsed,
      status: "complete",
      winnerId,
      turnPhase: "turn_complete",
      version: game.version + 1,
    });

    const matchRecord = await this.matchRepo.getMatch(game.matchId);
    if (!matchRecord) return { success: false, error: "Match not found", status: 404 };

    const nextMatch = applyMatchPoints({
      player1Score: matchRecord.player1Score,
      player2Score: matchRecord.player2Score,
      targetScore: matchRecord.targetScore,
      winnerRole,
      points,
    });

    if (nextMatch.status === "complete") {
      const matchWinnerId = nextMatch.winnerRole === "player1" ? player1Id : player2Id;

      await this.matchRepo.updateMatch(matchRecord.id, {
        player1Score: nextMatch.player1Score,
        player2Score: nextMatch.player2Score,
        status: "complete",
        winnerId: matchWinnerId,
      });

      this.eventBus.publish(sessionId, {
        type: MATCH_EVENT_TYPE.matchComplete,
        data: {
          winnerId: matchWinnerId,
          player1Score: nextMatch.player1Score,
          player2Score: nextMatch.player2Score,
        },
      });
    } else {
      await this.matchRepo.updateMatch(matchRecord.id, {
        player1Score: nextMatch.player1Score,
        player2Score: nextMatch.player2Score,
      });

      await this.createNewGame(matchRecord.id, player1Id, player2Id);
      this.eventBus.publish(sessionId, {
        type: MATCH_EVENT_TYPE.gameOver,
        data: {
          winnerId,
          points,
          player1Score: nextMatch.player1Score,
          player2Score: nextMatch.player2Score,
        },
      });
    }

    await this.publishLatestMatchState(sessionId);
    logger.info({ gameId, winnerId, points }, "[GAME] Game won");
    return { success: true };
  }
}

export const matchService = new MatchService();

import {
  GAME_STATUS,
  MATCH_STATUS,
  PLAYER_ROLE,
  TURN_PHASE,
  type PlayerRole,
  type TurnPhase,
  type Bar,
  type Board,
  type BorneOff,
  type Dice,
  type DiceUsed,
  type GameState,
  type MatchState,
} from "../types";
import { initializeDiceUsed } from "./dice";
import { hasAnyLegalMove } from "./turn-validation";
import { checkMatchComplete, checkWin } from "./win-detection";

export interface PersistableGameState extends Omit<GameState, "id"> {}

export function createOpeningGameState(input: {
  matchId: string;
  player1Id: string;
  player2Id: string;
  openingDice: Dice;
  initialBoard: Board;
  initialBar: Bar;
  initialBorneOff: BorneOff;
}): PersistableGameState {
  const [die1, die2] = input.openingDice;
  const firstPlayer = die1 > die2 ? input.player1Id : input.player2Id;

  return {
    matchId: input.matchId,
    board: input.initialBoard,
    bar: input.initialBar,
    borneOff: input.initialBorneOff,
    currentTurn: firstPlayer,
    turnPhase: TURN_PHASE.moving,
    dice: input.openingDice,
    diceUsed: initializeDiceUsed(input.openingDice),
    doublingCube: 1,
    cubeOwner: null,
    version: 1,
    status: GAME_STATUS.inProgress,
    winnerId: null,
  };
}

export function determineWinnerRole(borneOff: BorneOff): PlayerRole | null {
  if (checkWin(borneOff, PLAYER_ROLE.player1)) return PLAYER_ROLE.player1;
  if (checkWin(borneOff, PLAYER_ROLE.player2)) return PLAYER_ROLE.player2;
  return null;
}

export function applyMatchPoints(input: {
  player1Score: number;
  player2Score: number;
  targetScore: number;
  winnerRole: PlayerRole;
  points: number;
}): Pick<MatchState, "player1Score" | "player2Score" | "status" | "winnerId"> & {
  winnerRole: PlayerRole | null;
} {
  const nextPlayer1Score =
    input.player1Score + (input.winnerRole === PLAYER_ROLE.player1 ? input.points : 0);
  const nextPlayer2Score =
    input.player2Score + (input.winnerRole === PLAYER_ROLE.player2 ? input.points : 0);
  const matchResult = checkMatchComplete(nextPlayer1Score, nextPlayer2Score, input.targetScore);

  return {
    player1Score: nextPlayer1Score,
    player2Score: nextPlayer2Score,
    status: matchResult.complete ? MATCH_STATUS.complete : MATCH_STATUS.active,
    winnerId: null,
    winnerRole: matchResult.winner,
  };
}

export function advanceTurnState(input: {
  board: Board;
  bar: Bar;
  borneOff: BorneOff;
  player1Id: string;
  currentPlayerId: string;
  opponentId: string;
  doublingCube: number;
  cubeOwner: string | null;
  opponentRoll: Dice;
  currentPlayerRoll: Dice;
  fallbackOpponentRoll?: Dice;
}): {
  currentTurn: string;
  turnPhase: TurnPhase;
  dice: Dice;
  diceUsed: DiceUsed;
} {
  const canDouble =
    input.doublingCube < 64 && (input.cubeOwner === null || input.cubeOwner === input.opponentId);

  const nextTurnPhase: TurnPhase = canDouble
    ? TURN_PHASE.waitingForRollOrDouble
    : TURN_PHASE.moving;
  const opponentRole: PlayerRole =
    input.opponentId === input.player1Id ? PLAYER_ROLE.player1 : PLAYER_ROLE.player2;

  if (nextTurnPhase === TURN_PHASE.waitingForRollOrDouble) {
    return {
      currentTurn: input.opponentId,
      turnPhase: nextTurnPhase,
      dice: input.opponentRoll,
      diceUsed: initializeDiceUsed(input.opponentRoll),
    };
  }

  const opponentDiceUsed = initializeDiceUsed(input.opponentRoll);
  if (
    hasAnyLegalMove(
      input.board,
      input.bar,
      input.borneOff,
      input.opponentRoll,
      opponentDiceUsed,
      opponentRole,
    )
  ) {
    return {
      currentTurn: input.opponentId,
      turnPhase: TURN_PHASE.moving,
      dice: input.opponentRoll,
      diceUsed: opponentDiceUsed,
    };
  }

  const currentRole: PlayerRole =
    input.currentPlayerId === input.player1Id ? PLAYER_ROLE.player1 : PLAYER_ROLE.player2;
  const currentPlayerDiceUsed = initializeDiceUsed(input.currentPlayerRoll);
  if (
    hasAnyLegalMove(
      input.board,
      input.bar,
      input.borneOff,
      input.currentPlayerRoll,
      currentPlayerDiceUsed,
      currentRole,
    )
  ) {
    return {
      currentTurn: input.currentPlayerId,
      turnPhase: TURN_PHASE.moving,
      dice: input.currentPlayerRoll,
      diceUsed: currentPlayerDiceUsed,
    };
  }

  const fallbackRoll = input.fallbackOpponentRoll ?? input.opponentRoll;
  return {
    currentTurn: input.opponentId,
    turnPhase: TURN_PHASE.waitingForRollOrDouble,
    dice: fallbackRoll,
    diceUsed: initializeDiceUsed(fallbackRoll),
  };
}

/**
 * Maps server-side MatchState/GameState (signed-int board, player UUIDs)
 * to the UI GameState (white/red per point, color-based).
 *
 * Convention: player1 = white (host), player2 = red (guest).
 */

import {
  PLAYER_COLOUR,
  TURN_PHASE,
  type MatchState,
  type PlayerColour as PlayerColourType,
  type TurnPhase as TurnPhaseType,
} from "@appgammon/common";
import type { GameState as UIGameState, BoardState, LastEmote } from "@/types/game";
import { INITIAL_BOARD } from "@/types/game";

function uuidToColor(uuid: string | null, player1Id: string): PlayerColourType | null {
  if (!uuid) return null;
  return uuid === player1Id ? PLAYER_COLOUR.white : PLAYER_COLOUR.red;
}

function boardFromServer(board: number[]): BoardState["points"] {
  return board.map((val) => ({
    white: Math.max(0, val),
    red: Math.abs(Math.min(0, val)),
  }));
}

function canPlayerProposeDouble(
  turnPhase: TurnPhaseType,
  currentTurnId: string,
  myPlayerId: string,
  cubeOwner: string | null,
  doublingCube: number,
): boolean {
  if (currentTurnId !== myPlayerId) return false;
  if (turnPhase !== TURN_PHASE.waitingForRollOrDouble) return false;
  if (doublingCube >= 64) return false;
  if (cubeOwner !== null && cubeOwner !== myPlayerId) return false;
  return true;
}

export function mapServerToUIGameState(
  matchState: MatchState,
  player1Id: string,
  myPlayerId: string,
  pendingDoubleProposal: boolean,
  lastEmote: LastEmote | null,
): UIGameState {
  const game = matchState.currentGame;

  if (!game) {
    return {
      board: INITIAL_BOARD,
      currentPlayer: PLAYER_COLOUR.white,
      dice: null,
      doublingCube: 1,
      doublingCubeOwner: null,
      pendingDoubleProposal: false,
      matchScore: {
        white: matchState.player1Score,
        red: matchState.player2Score,
      },
      matchLength: matchState.targetScore as 3 | 5 | 7,
      lastEmote,
      canMove: false,
      canRoll: false,
      canProposeDouble: false,
    };
  }

  const isMyTurn = game.currentTurn === myPlayerId;
  const currentPlayer = uuidToColor(game.currentTurn, player1Id) ?? PLAYER_COLOUR.white;
  const waitingForRoll = game.turnPhase === TURN_PHASE.waitingForRollOrDouble;

  return {
    board: {
      points: boardFromServer(game.board),
      bar: {
        white: game.bar.player1,
        red: game.bar.player2,
      },
      borneOff: {
        white: game.borneOff.player1,
        red: game.borneOff.player2,
      },
    },
    currentPlayer,
    dice: waitingForRoll ? null : game.dice,
    doublingCube: game.doublingCube,
    doublingCubeOwner: uuidToColor(game.cubeOwner, player1Id),
    pendingDoubleProposal,
    matchScore: {
      white: matchState.player1Score,
      red: matchState.player2Score,
    },
    matchLength: matchState.targetScore as 3 | 5 | 7,
    lastEmote,
    canMove: isMyTurn && game.turnPhase === TURN_PHASE.moving,
    canRoll: isMyTurn && waitingForRoll,
    canProposeDouble: canPlayerProposeDouble(
      game.turnPhase,
      game.currentTurn,
      myPlayerId,
      game.cubeOwner,
      game.doublingCube,
    ),
  };
}

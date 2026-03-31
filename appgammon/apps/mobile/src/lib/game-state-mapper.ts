/**
 * Maps server-side SeriesState/GameState (signed-int board, player UUIDs)
 * to the UI GameState (white/red per point, color-based).
 *
 * Convention: player1 = white (host), player2 = red (guest).
 */

import type { SeriesState, PlayerColor, TurnPhase } from "@appgammon/common";
import type { GameState as UIGameState, BoardState, LastEmote } from "@/types/game";
import { INITIAL_BOARD } from "@/types/game";

function uuidToColor(uuid: string | null, player1Id: string): PlayerColor | null {
  if (!uuid) return null;
  return uuid === player1Id ? "white" : "red";
}

function boardFromServer(board: number[]): BoardState["points"] {
  return board.map((val) => ({
    white: Math.max(0, val),
    red: Math.abs(Math.min(0, val)),
  }));
}

function canPlayerProposeDouble(
  turnPhase: TurnPhase,
  currentTurnId: string,
  myPlayerId: string,
  cubeOwner: string | null,
  doublingCube: number,
): boolean {
  if (currentTurnId !== myPlayerId) return false;
  if (turnPhase !== "waiting_for_roll_or_double") return false;
  if (doublingCube >= 64) return false;
  if (cubeOwner !== null && cubeOwner !== myPlayerId) return false;
  return true;
}

export function mapServerToUIGameState(
  seriesState: SeriesState,
  player1Id: string,
  myPlayerId: string,
  pendingDoubleProposal: boolean,
  lastEmote: LastEmote | null,
): UIGameState {
  const game = seriesState.currentGame;

  if (!game) {
    return {
      board: INITIAL_BOARD,
      currentPlayer: "white",
      dice: null,
      doublingCube: 1,
      doublingCubeOwner: null,
      pendingDoubleProposal: false,
      matchScore: {
        white: seriesState.player1Score,
        red: seriesState.player2Score,
      },
      matchLength: seriesState.bestOf as 3 | 5 | 7,
      lastEmote,
      canMove: false,
      canRoll: false,
      canProposeDouble: false,
    };
  }

  const isMyTurn = game.currentTurn === myPlayerId;
  const currentPlayer = uuidToColor(game.currentTurn, player1Id) ?? "white";
  const waitingForRoll = game.turnPhase === "waiting_for_roll_or_double";

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
      white: seriesState.player1Score,
      red: seriesState.player2Score,
    },
    matchLength: seriesState.bestOf as 3 | 5 | 7,
    lastEmote,
    canMove: isMyTurn && game.turnPhase === "moving",
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

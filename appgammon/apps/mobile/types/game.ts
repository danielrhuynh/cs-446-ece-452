/**
 * Game state types for backgammon UI.
 * Board: 24 points, indices 0-23 (point 1 = index 0, point 24 = index 23)
 * Red home: 0-5, Red outer: 6-11, White outer: 12-17, White home: 18-23
 */

import type { PlayerColor, EmoteId } from "@appgammon/common";
export type { PlayerColor, EmoteId } from "@appgammon/common";
export { EMOTES } from "@appgammon/common";

export interface PointState {
  white: number;
  red: number;
}

export interface BarState {
  white: number;
  red: number;
}

export interface BoardState {
  points: PointState[];
  bar: BarState;
}

/** Initial board config per proposal 2.2.a */
export const INITIAL_BOARD: BoardState = {
  points: Array.from({ length: 24 }, (_, i) => ({ white: 0, red: 0 })).map(
    (p, i) => {
      // Red: 2 on 1, 5 on 12, 3 on 17, 5 on 19
      if (i === 0) return { ...p, red: 2 };
      if (i === 11) return { ...p, red: 5 };
      if (i === 16) return { ...p, red: 3 };
      if (i === 18) return { ...p, red: 5 };
      // White: 2 on 24, 5 on 13, 3 on 8, 5 on 6
      if (i === 23) return { ...p, white: 2 };
      if (i === 12) return { ...p, white: 5 };
      if (i === 7) return { ...p, white: 3 };
      if (i === 5) return { ...p, white: 5 };
      return p;
    }
  ),
  bar: { white: 0, red: 0 },
};

export interface LastEmote {
  emoteId: EmoteId;
  fromPlayer: PlayerColor;
  timestamp: number;
}

export interface GameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  dice: [number, number] | null;
  doublingCube: number;
  doublingCubeOwner: PlayerColor | null;
  pendingDoubleProposal: boolean;
  matchScore: { white: number; red: number };
  matchLength: 3 | 5 | 7;
  lastEmote: LastEmote | null;
  canMove: boolean;
  canProposeDouble: boolean;
}

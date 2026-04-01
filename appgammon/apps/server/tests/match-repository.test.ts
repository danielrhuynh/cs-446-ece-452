import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTION_TYPE, type Move } from "@appgammon/common";
import { moves } from "../src/db/schema";

const { values, insert } = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { values, insert };
});

vi.mock("../src/db/client", () => ({
  db: {
    insert,
  },
}));

import { matchRepo } from "../src/repositories/match-repository";

describe("match-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    values.mockResolvedValue(undefined);
  });

  it("skips inserts when there are no moves to persist", async () => {
    await matchRepo.appendMoves("game-1", "player-1", 1, []);

    expect(insert).not.toHaveBeenCalled();
    expect(values).not.toHaveBeenCalled();
  });

  it("batch inserts persisted moves with sequential move numbers", async () => {
    const playerMoves: Move[] = [
      { from: 5, to: 3 },
      { from: 3, to: 0 },
    ];

    await matchRepo.appendMoves("game-1", "player-1", 7, playerMoves);

    expect(insert).toHaveBeenCalledWith(moves);
    expect(values).toHaveBeenCalledWith([
      {
        game_id: "game-1",
        player_id: "player-1",
        move_number: 7,
        action_type: ACTION_TYPE.move,
        action_data: playerMoves[0],
      },
      {
        game_id: "game-1",
        player_id: "player-1",
        move_number: 8,
        action_type: ACTION_TYPE.move,
        action_data: playerMoves[1],
      },
    ]);
  });
});

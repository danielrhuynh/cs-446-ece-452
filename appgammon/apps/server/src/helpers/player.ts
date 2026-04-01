import { type PlayerRole } from "@appgammon/common";

export function getPlayerRole(
  playerId: string,
  player1Id: string,
  player2Id: string,
): PlayerRole | null {
  if (playerId === player1Id) return "player1";
  if (playerId === player2Id) return "player2";
  return null;
}

export function getOpponentId(role: PlayerRole, player1Id: string, player2Id: string): string {
  return role === "player1" ? player2Id : player1Id;
}

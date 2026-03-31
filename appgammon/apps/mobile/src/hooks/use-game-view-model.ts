import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelSession,
  proposeDouble,
  respondToDouble,
  rollDice,
  sendEmote,
  submitMoves,
} from "@/lib/api";
import { mapServerToUIGameState } from "@/lib/game-state-mapper";
import { useGameEvents } from "./use-game-events";
import { useSessionEvents } from "./use-session-events";
import type { EmoteId, LastEmote, PlayerColor } from "@/types/game";
import {
  applyMove,
  colorToRole,
  getAvailableDice,
  findMatchingDieForMove,
  getValidMoves,
  initializeDiceUsed,
  markDieUsed,
  type Move,
  type PlayerRole,
} from "@appgammon/common";

/** Maps game events and actions into game-screen UI state. */

export function useGameViewModel(sessionId: string | undefined, isHost: boolean) {
  const { session, lastEvent: sessionLastEvent } = useSessionEvents(sessionId);
  const {
    seriesState,
    doubleProposal,
    lastEmote: sseEmote,
    gameOverInfo,
    seriesCompleteInfo,
  } = useGameEvents(sessionId);

  const player1Id = session?.player_1_id ?? "";
  const myPlayerId = isHost ? (session?.player_1_id ?? "") : (session?.player_2_id ?? "");
  const playerColor: PlayerColor = isHost ? "white" : "red";
  const myRole: PlayerRole = colorToRole(playerColor);

  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [emotesMuted, setEmotesMuted] = useState(false);
  const [lastEmote, setLastEmote] = useState<LastEmote | null>(null);

  useEffect(() => {
    if (!sseEmote || emotesMuted) return;
    const fromColor: PlayerColor = sseEmote.fromPlayer === player1Id ? "white" : "red";
    setLastEmote({
      emoteId: sseEmote.emoteId as EmoteId,
      fromPlayer: fromColor,
      timestamp: sseEmote.timestamp,
    });
  }, [emotesMuted, player1Id, sseEmote]);

  const serverGame = seriesState?.currentGame ?? null;
  const workingState = useMemo(() => {
    if (!serverGame) return null;

    const dice: [number, number] = serverGame.dice ?? [1, 1];
    let board = [...serverGame.board];
    let bar = { ...serverGame.bar };
    let borneOff = { ...serverGame.borneOff };
    let diceUsed = serverGame.diceUsed ? [...serverGame.diceUsed] : initializeDiceUsed(dice);

    for (const move of pendingMoves) {
      const matchedDie = findMatchingDieForMove(board, bar, borneOff, dice, diceUsed, move, myRole);
      if (matchedDie === null) break;

      const result = applyMove(board, bar, borneOff, move, myRole);
      board = result.board;
      bar = result.bar;
      borneOff = result.borneOff;
      diceUsed = markDieUsed(dice, diceUsed, matchedDie);
    }

    return { board, bar, borneOff, diceUsed, dice };
  }, [myRole, pendingMoves, serverGame]);

  const gameVersionRef = useRef<number | null>(null);
  useEffect(() => {
    if (!serverGame) return;
    if (gameVersionRef.current !== null && gameVersionRef.current !== serverGame.version) {
      setPendingMoves([]);
      setSelectedPoint(null);
    }
    gameVersionRef.current = serverGame.version;
  }, [serverGame]);

  const uiGameState = useMemo(() => {
    if (!seriesState) return null;

    const mapped = mapServerToUIGameState(
      seriesState,
      player1Id,
      myPlayerId,
      doubleProposal !== null,
      lastEmote,
    );

    if (workingState && seriesState.currentGame) {
      mapped.board = {
        points: workingState.board.map((value) => ({
          white: Math.max(0, value),
          red: Math.abs(Math.min(0, value)),
        })),
        bar: {
          white: workingState.bar.player1,
          red: workingState.bar.player2,
        },
        borneOff: {
          white: workingState.borneOff.player1,
          red: workingState.borneOff.player2,
        },
      };
    }

    return mapped;
  }, [doubleProposal, lastEmote, myPlayerId, player1Id, seriesState, workingState]);

  const leaveSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await cancelSession(sessionId);
    } catch {
      // Ignore cancel failures.
    }
  }, [sessionId]);

  const rollCurrentTurn = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    await rollDice(sessionId, serverGame.id);
  }, [serverGame, sessionId]);

  const selectPoint = useCallback(
    (pointIndex: number) => {
      if (!serverGame || !workingState || !uiGameState?.canMove) return;
      const dice = workingState.dice;
      const available = getAvailableDice(dice, workingState.diceUsed);
      if (available.length === 0) return;

      if (selectedPoint === null) {
        const hasValidMove = available.some((die) => {
          const validMoves = getValidMoves(
            workingState.board,
            workingState.bar,
            workingState.borneOff,
            myRole,
            die,
          );
          return validMoves.some((move) => move.from === pointIndex);
        });

        if (hasValidMove) {
          setSelectedPoint(pointIndex);
        }
        return;
      }

      const move: Move = { from: selectedPoint, to: pointIndex };
      const matchedDie = findMatchingDieForMove(
        workingState.board,
        workingState.bar,
        workingState.borneOff,
        dice,
        workingState.diceUsed,
        move,
        myRole,
      );
      if (matchedDie !== null) {
        setPendingMoves((prev) => [...prev, move]);
        setSelectedPoint(null);
        return;
      }

      if (available.length >= 2) {
        const uniqueDice = new Set(available);
        for (const die1 of uniqueDice) {
          const firstMoves = getValidMoves(
            workingState.board,
            workingState.bar,
            workingState.borneOff,
            myRole,
            die1,
          );

          for (const firstMove of firstMoves) {
            if (firstMove.from !== selectedPoint) continue;

            const after = applyMove(
              workingState.board,
              workingState.bar,
              workingState.borneOff,
              firstMove,
              myRole,
            );
            const updatedDiceUsed = markDieUsed(dice, workingState.diceUsed, die1);
            const remaining = getAvailableDice(dice, updatedDiceUsed);

            for (const die2 of new Set(remaining)) {
              const secondMoves = getValidMoves(
                after.board,
                after.bar,
                after.borneOff,
                myRole,
                die2,
              );
              const secondMove = secondMoves.find(
                (candidate) => candidate.from === firstMove.to && candidate.to === pointIndex,
              );
              if (secondMove) {
                setPendingMoves((prev) => [...prev, firstMove, secondMove]);
                setSelectedPoint(null);
                return;
              }
            }
          }
        }
      }

      setSelectedPoint(null);
    },
    [myRole, selectedPoint, serverGame, uiGameState?.canMove, workingState],
  );

  const submitPendingMoveSequence = useCallback(async () => {
    if (!sessionId || !serverGame || pendingMoves.length === 0) return;

    try {
      await submitMoves(sessionId, serverGame.id, serverGame.version, pendingMoves);
      setPendingMoves([]);
      setSelectedPoint(null);
    } catch (error) {
      setPendingMoves([]);
      setSelectedPoint(null);
      throw error;
    }
  }, [pendingMoves, serverGame, sessionId]);

  const proposeDoubleAction = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    await proposeDouble(sessionId, serverGame.id);
  }, [serverGame, sessionId]);

  const acceptDoubleAction = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    await respondToDouble(sessionId, serverGame.id, "accept");
  }, [serverGame, sessionId]);

  const declineDoubleAction = useCallback(async () => {
    if (!sessionId || !serverGame) return;
    await respondToDouble(sessionId, serverGame.id, "decline");
  }, [serverGame, sessionId]);

  const sendLocalEmote = useCallback(
    async (emoteId: EmoteId) => {
      if (!sessionId) return;

      setLastEmote({ emoteId, fromPlayer: playerColor, timestamp: Date.now() });
      try {
        await sendEmote(sessionId, emoteId);
      } catch {
        // Ignore send failures. The server still enforces rate limits.
      }
    },
    [playerColor, sessionId],
  );

  return {
    session,
    uiGameState,
    playerColor,
    selectedPoint,
    emotesMuted,
    setEmotesMuted,
    shouldExitSession: sessionLastEvent === "session_cancelled" || session?.status === "cancelled",
    gameOverInfo,
    seriesCompleteInfo,
    isLoading: !session || !uiGameState,
    canSubmitMoves: pendingMoves.length > 0 && !!uiGameState?.canMove,
    actions: {
      leaveSession,
      onPointPress: selectPoint,
      onRollDice: rollCurrentTurn,
      onSubmitMoves: submitPendingMoveSequence,
      onProposeDouble: proposeDoubleAction,
      onAcceptDouble: acceptDoubleAction,
      onDeclineDouble: declineDoubleAction,
      onEmoteSelect: sendLocalEmote,
    },
  };
}

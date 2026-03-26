import type { GameEventType } from "@appgammon/common";
import { createPubSub } from "./pubsub";

export interface GameEvent {
  type: GameEventType;
  data: unknown;
  /** If set, only deliver to this player ID. */
  forPlayer?: string;
}

const pubsub = createPubSub<GameEvent>();
export const subscribeGame = pubsub.subscribe;
export const publishGame = pubsub.publish;

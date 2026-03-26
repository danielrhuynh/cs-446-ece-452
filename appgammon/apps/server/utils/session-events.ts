import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";
import { createPubSub } from "./pubsub";

export interface SessionEvent {
  type: SessionEventType;
  session: SessionWithPlayers;
}

const { subscribe, publish } = createPubSub<SessionEvent>();
export { subscribe, publish };

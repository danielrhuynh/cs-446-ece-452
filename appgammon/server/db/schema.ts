import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { session_status } from "@appgammon/common";
import { generateId } from "../utils/id";

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  device_id: text("device_id").notNull(),
  device_token: text("device_token"), // https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 6 }).primaryKey().$defaultFn(() => generateId()),
  status: text("status").notNull().default(session_status.open),
  player_1_id: uuid("player1_id")
    .references(() => players.id)
    .notNull(),
  player_2_id: uuid("player2_id").references(() => players.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

import { pgTable, uuid, text, timestamp, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { session_status } from "@appgammon/common";
import { generateId } from "../utils/id";

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  device_id: text("device_id").notNull().unique(),
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

export const series = pgTable("series", {
  id: uuid("id").defaultRandom().primaryKey(),
  session_id: varchar("session_id", { length: 6 })
    .references(() => sessions.id)
    .notNull(),
  best_of: integer("best_of").notNull(),
  player1_score: integer("player1_score").notNull().default(0),
  player2_score: integer("player2_score").notNull().default(0),
  status: text("status").notNull().default("active"),
  winner_id: uuid("winner_id").references(() => players.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  series_id: uuid("series_id")
    .references(() => series.id)
    .notNull(),
  board: jsonb("board").notNull(),
  bar: jsonb("bar").notNull(),
  borne_off: jsonb("borne_off").notNull(),
  current_turn: uuid("current_turn")
    .references(() => players.id)
    .notNull(),
  turn_phase: text("turn_phase").notNull().default("waiting_for_roll_or_double"),
  dice: jsonb("dice"),
  dice_used: jsonb("dice_used"),
  doubling_cube: integer("doubling_cube").notNull().default(1),
  cube_owner: uuid("cube_owner").references(() => players.id),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("in_progress"),
  winner_id: uuid("winner_id").references(() => players.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const moves = pgTable("moves", {
  id: uuid("id").defaultRandom().primaryKey(),
  game_id: uuid("game_id")
    .references(() => games.id)
    .notNull(),
  player_id: uuid("player_id")
    .references(() => players.id)
    .notNull(),
  move_number: integer("move_number").notNull(),
  action_type: text("action_type").notNull(),
  action_data: jsonb("action_data").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

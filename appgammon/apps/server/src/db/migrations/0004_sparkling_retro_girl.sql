CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"board" jsonb NOT NULL,
	"bar" jsonb NOT NULL,
	"borne_off" jsonb NOT NULL,
	"current_turn" uuid NOT NULL,
	"turn_phase" text DEFAULT 'waiting_for_roll_or_double' NOT NULL,
	"dice" jsonb,
	"dice_used" jsonb,
	"doubling_cube" integer DEFAULT 1 NOT NULL,
	"cube_owner" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"winner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"move_number" integer NOT NULL,
	"action_type" text NOT NULL,
	"action_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(6) NOT NULL,
	"best_of" integer NOT NULL,
	"player1_score" integer DEFAULT 0 NOT NULL,
	"player2_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"winner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_current_turn_players_id_fk" FOREIGN KEY ("current_turn") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_cube_owner_players_id_fk" FOREIGN KEY ("cube_owner") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;